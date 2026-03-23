import {
  createLoader,
  createSerializer,
  parseAsNumberLiteral,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

import {
  yearOptions,
  monthOptions,
  agencyOptions,
  offenseCodeOptions,
} from "./nuqs-options.generated";

export * from "./nuqs-options.generated";

export const searchParams = {
  year: parseAsNumberLiteral(yearOptions).withDefault(2024),
  month: parseAsStringLiteral(monthOptions).withDefault("all"),
  agencyId: parseAsStringLiteral(agencyOptions).withDefault("all"),
  offenseCode: parseAsStringLiteral(offenseCodeOptions).withDefault("all"),
};

export type SearchParams = inferParserType<typeof searchParams>;

export const loadSearchParams = createLoader(searchParams);

export const serializeSearchParams = createSerializer(searchParams, {
  processUrlSearchParams: (search) => {
    search.sort();
    return search;
  },
});
