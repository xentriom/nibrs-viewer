import { parseAsNumberLiteral, parseAsStringLiteral, type inferParserType } from "nuqs/server";
import { yearOptions, offenseCodeOptions } from "./options.generated";

export const searchParams = {
  year: parseAsNumberLiteral(yearOptions).withDefault(yearOptions.at(-1)!),
  month: parseAsStringLiteral([
    "all",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ]).withDefault("all"),
  offenseCode: parseAsStringLiteral(offenseCodeOptions).withDefault("all"),
};

export type SearchParams = inferParserType<typeof searchParams>;
