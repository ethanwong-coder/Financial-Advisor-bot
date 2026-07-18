/**
 * Plaid account aggregation, behind a small adapter.
 *
 * If PLAID_CLIENT_ID and PLAID_SECRET are set, this talks to Plaid (sandbox by
 * default). If they are absent, it falls back to a deterministic MOCK adapter so
 * the whole link -> exchange -> fetch flow works with no credentials. Flip to
 * live sandbox simply by adding the two env vars.
 *
 * NOTE: Plaid (like most custodians) does NOT expose beneficiary designations.
 * We pull account types + balances only; beneficiary data is entered manually.
 */
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import type { AccountType } from "@/lib/rules/types";
import { log } from "@/lib/log";

export interface NormalizedAccount {
  plaidAccountId: string;
  institutionName?: string;
  accountType: AccountType;
  nickname: string;
  balance: number | null;
  currency: string;
}

export interface PlaidAdapter {
  readonly mode: "live" | "mock";
  createLinkToken(userId: string): Promise<string>;
  exchangePublicToken(
    publicToken: string,
  ): Promise<{ accessToken: string; itemId: string; institutionName?: string }>;
  getAccounts(accessToken: string): Promise<NormalizedAccount[]>;
}

function mapAccountType(subtype?: string | null, type?: string | null): AccountType {
  switch ((subtype ?? "").toLowerCase()) {
    case "ira":
      return "TRADITIONAL_IRA";
    case "roth":
    case "roth ira":
      return "ROTH_IRA";
    case "401k":
      return "PLAN_401K";
    case "403b":
      return "PLAN_403B";
    case "hsa":
      return "HSA";
    case "checking":
      return "BANK_CHECKING";
    case "savings":
      return "BANK_SAVINGS";
    case "brokerage":
      return "BROKERAGE";
    default:
      if ((type ?? "").toLowerCase() === "investment") return "BROKERAGE";
      if ((type ?? "").toLowerCase() === "depository") return "BANK_CHECKING";
      return "OTHER";
  }
}

// ---------------------------------------------------------------------------
// Mock adapter (no credentials required)
// ---------------------------------------------------------------------------
const MOCK_ACCESS_TOKEN = "mock-access-token";

const mockAdapter: PlaidAdapter = {
  mode: "mock",
  async createLinkToken() {
    return "link-sandbox-mock-token";
  },
  async exchangePublicToken() {
    return {
      accessToken: MOCK_ACCESS_TOKEN,
      itemId: `mock-item-${Date.now()}`,
      institutionName: "Sandbox Mock Bank",
    };
  },
  async getAccounts() {
    return [
      {
        plaidAccountId: "mock-ira",
        institutionName: "Sandbox Mock Bank",
        accountType: "TRADITIONAL_IRA",
        nickname: "Rollover IRA",
        balance: 184320.55,
        currency: "USD",
      },
      {
        plaidAccountId: "mock-checking",
        institutionName: "Sandbox Mock Bank",
        accountType: "BANK_CHECKING",
        nickname: "Everyday Checking",
        balance: 8210.12,
        currency: "USD",
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Live adapter (Plaid sandbox by default)
// ---------------------------------------------------------------------------
function createLiveAdapter(clientId: string, secret: string): PlaidAdapter {
  const env = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();
  const basePath =
    PlaidEnvironments[env as keyof typeof PlaidEnvironments] ??
    PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
  const client = new PlaidApi(configuration);

  return {
    mode: "live",
    async createLinkToken(userId: string) {
      const res = await client.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: "Estate Organizer",
        products: [Products.Auth],
        country_codes: [CountryCode.Us],
        language: "en",
      });
      return res.data.link_token;
    },
    async exchangePublicToken(publicToken: string) {
      const res = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      return { accessToken: res.data.access_token, itemId: res.data.item_id };
    },
    async getAccounts(accessToken: string) {
      const res = await client.accountsGet({ access_token: accessToken });
      const institutionName = undefined;
      return res.data.accounts.map((a) => ({
        plaidAccountId: a.account_id,
        institutionName,
        accountType: mapAccountType(a.subtype, a.type),
        nickname: a.name ?? a.official_name ?? "Account",
        balance: a.balances.current ?? null,
        currency: a.balances.iso_currency_code ?? "USD",
      }));
    },
  };
}

let cached: PlaidAdapter | null = null;

/** Returns the live adapter when Plaid credentials exist, else the mock. */
export function getPlaidAdapter(): PlaidAdapter {
  if (cached) return cached;
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (clientId && secret) {
    cached = createLiveAdapter(clientId, secret);
  } else {
    log.warn(
      "Plaid credentials not set — using MOCK adapter. Set PLAID_CLIENT_ID and PLAID_SECRET to use the live sandbox.",
    );
    cached = mockAdapter;
  }
  return cached;
}

export const MOCK_PLAID_ACCESS_TOKEN = MOCK_ACCESS_TOKEN;
