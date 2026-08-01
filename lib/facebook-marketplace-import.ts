export type FacebookMarketplaceListing = {
  id?: string;
  url?: string;
  title?: string;
  price?: {
    amount?: string | number;
    currency?: string;
    formatted?: string;
  } | null;
  location?: {
    full?: string;
    city?: string;
    state?: string;
    country?: string | null;
    latitude?: number;
    longitude?: number;
  } | null;
  images?: string[];
  description?: string | null;
  condition?: string | null;
  attribute_data?: Array<{
    attribute_name?: string;
    value?: string;
    label?: string;
  }>;
};

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId: string;
};

const APIFY_ACTOR_ID =
  "calm_builder~facebook-marketplace-scraper";

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function numberOrNull(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value.replace(/[$,\s]/g, "")
    );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

export function getFacebookListingPrice(
  listing: FacebookMarketplaceListing
) {
  return numberOrNull(
    listing.price?.amount
  );
}

export function getFacebookListingCondition(
  listing: FacebookMarketplaceListing
) {
  const direct =
    normalizeText(listing.condition);

  if (direct) {
    return direct;
  }

  const conditionAttribute =
    listing.attribute_data?.find(
      (attribute) =>
        attribute.attribute_name
          ?.toLowerCase()
          .trim() === "condition"
    );

  return (
    normalizeText(
      conditionAttribute?.label
    ) ||
    normalizeText(
      conditionAttribute?.value
    )
  );
}

export async function fetchFacebookListingWithApify(
  listingUrl: string
): Promise<FacebookMarketplaceListing | null> {
  const token =
    process.env.APIFY_API_TOKEN;

  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is missing."
    );
  }

  const startResponse = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        startUrls: [
          {
            url: listingUrl,
          },
        ],
        maxListings: 1,
        fetchDetails: true,
        getNewItems: true,
        availability: "available",
        deduplicateListings: true,
      }),
      cache: "no-store",
    }
  );

  if (!startResponse.ok) {
    throw new Error(
      `Apify run failed to start: ${startResponse.status} ${await startResponse.text()}`
    );
  }

  const startPayload =
    await startResponse.json();

  const startedRun =
    startPayload.data as ApifyRun;

  const startedAt = Date.now();

  while (
    Date.now() - startedAt < 180000
  ) {
    const runResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${startedRun.id}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!runResponse.ok) {
      throw new Error(
        `Unable to read Apify run status: ${runResponse.status}`
      );
    }

    const runPayload =
      await runResponse.json();

    const run =
      runPayload.data as ApifyRun;

    if (run.status === "SUCCEEDED") {
      const datasetResponse =
        await fetch(
          `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      if (!datasetResponse.ok) {
        throw new Error(
          `Unable to retrieve Apify dataset: ${datasetResponse.status}`
        );
      }

      const payload =
        await datasetResponse.json();

      return Array.isArray(payload) &&
        payload.length > 0
        ? payload[0]
        : null;
    }

    if (
      [
        "FAILED",
        "ABORTED",
        "TIMED-OUT",
      ].includes(run.status)
    ) {
      throw new Error(
        `Apify run ended with status ${run.status}.`
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 3000)
    );
  }

  throw new Error(
    "Apify run did not finish within 3 minutes."
  );
}
