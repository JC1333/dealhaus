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

type CuriousCoderListing = {
  id?: string;
  inputUrl?: string;
  listingUrl?: string;
  marketplace_listing_title?: string;
  base_marketplace_listing_title?: string;
  redacted_description?: {
    text?: string;
  } | null;
  listing_price?: {
    amount?: string | number;
    currency?: string;
    formatted_amount_zeros_stripped?: string;
  } | null;
  location_text?: {
    text?: string;
  } | null;
  item_location?: {
    latitude?: number;
    longitude?: number;
  } | null;
  location?: {
    latitude?: number;
    longitude?: number;
  } | null;
  attribute_data?: Array<{
    attribute_name?: string;
    value?: string;
    label?: string;
  }>;
  listing_photos?: Array<{
    image?: {
      uri?: string;
      width?: number;
      height?: number;
    } | null;
  }>;
};

const APIFY_ACTOR_ID =
  "curious_coder~facebook-marketplace";

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

function getFacebookItemId(
  listingUrl: string
) {
  return (
    listingUrl.match(
      /\/marketplace\/item\/(\d+)/i
    )?.[1] || ""
  );
}

function normalizeCuriousCoderListing(
  listing: CuriousCoderListing
): FacebookMarketplaceListing {
  const images = Array.from(
    new Set(
      (listing.listing_photos || [])
        .map((photo) =>
          normalizeText(photo.image?.uri)
        )
        .filter((url) =>
          /^https?:\/\//i.test(url)
        )
    )
  ).slice(0, 12);

  const priceAmount =
    listing.listing_price?.amount;

  const latitude =
    listing.item_location?.latitude ??
    listing.location?.latitude;

  const longitude =
    listing.item_location?.longitude ??
    listing.location?.longitude;

  return {
    id: normalizeText(listing.id),
    url:
      normalizeText(listing.listingUrl) ||
      normalizeText(listing.inputUrl),
    title:
      normalizeText(
        listing.marketplace_listing_title
      ) ||
      normalizeText(
        listing.base_marketplace_listing_title
      ),
    description:
      normalizeText(
        listing.redacted_description?.text
      ),
    price: {
      amount:
        numberOrNull(priceAmount) ??
        priceAmount,
      currency:
        normalizeText(
          listing.listing_price?.currency
        ),
      formatted:
        normalizeText(
          listing.listing_price
            ?.formatted_amount_zeros_stripped
        ),
    },
    location: {
      full: normalizeText(
        listing.location_text?.text
      ),
      latitude,
      longitude,
    },
    images,
    attribute_data:
      Array.isArray(listing.attribute_data)
        ? listing.attribute_data
        : [],
    condition: null,
  };
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
        normalizeText(
          attribute.attribute_name
        ).toLowerCase() === "condition"
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

  const expectedListingId =
    getFacebookItemId(listingUrl);

  if (!expectedListingId) {
    throw new Error(
      "A valid Facebook Marketplace item URL is required."
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
        urls: [listingUrl],
        getListingDetails: true,
        getAllListingPhotos: true,
        strictFiltering: true,
        proxy: {
          useApifyProxy: true,
          apifyProxyCountry: "US",
        },
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

      const rawListing =
        Array.isArray(payload) &&
        payload.length > 0
          ? (payload[0] as CuriousCoderListing)
          : null;

      if (!rawListing) {
        return null;
      }

      const returnedListingId =
        normalizeText(rawListing.id) ||
        getFacebookItemId(
          normalizeText(
            rawListing.listingUrl
          )
        );

      if (
        returnedListingId !==
        expectedListingId
      ) {
        throw new Error(
          `Facebook import returned listing ${returnedListingId || "unknown"} instead of ${expectedListingId}.`
        );
      }

      const normalized =
        normalizeCuriousCoderListing(
          rawListing
        );

      if (
        !normalized.images ||
        normalized.images.length === 0
      ) {
        throw new Error(
          "Facebook listing was found, but no real listing photos were returned."
        );
      }

      return normalized;
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
