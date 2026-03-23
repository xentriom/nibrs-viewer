import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

export const yearOptions = [2020, 2021, 2022, 2023, 2024];

export const searchParams = {
  year: parseAsNumberLiteral(yearOptions).withDefault(2024),
};

export type SearchParams = inferParserType<typeof searchParams>;

export const loadSearchParams = createLoader(searchParams);

export const serializeSearchParams = createSerializer(searchParams, {
  processUrlSearchParams: (search) => {
    search.sort();
    return search;
  },
});
