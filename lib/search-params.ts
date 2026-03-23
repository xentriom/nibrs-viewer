import {
  createLoader,
  createSerializer,
  parseAsNumberLiteral,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

export const yearOptions = [2020, 2021, 2022, 2023, 2024];
export const monthOptions = ["1"];
export const agencyOptions = ["1"];
export const offenseCodeOptions = ["1"];

export const searchParams = {
  year: parseAsNumberLiteral(yearOptions).withDefault(2024),
  month: parseAsStringLiteral(monthOptions).withDefault("1"),
  agencyId: parseAsStringLiteral(agencyOptions).withDefault("1"),
  offenseCode: parseAsStringLiteral(offenseCodeOptions).withDefault("1"),
};

export type SearchParams = inferParserType<typeof searchParams>;

export const loadSearchParams = createLoader(searchParams);

export const serializeSearchParams = createSerializer(searchParams, {
  processUrlSearchParams: (search) => {
    search.sort();
    return search;
  },
});
