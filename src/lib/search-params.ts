import { createLoader, createSearchParamsCache, createSerializer } from "nuqs/server";
import { searchParams } from "./search-configs";

export * from "./search-configs";

export const loadSearchParams = createLoader(searchParams);

export const searchParamsCache = createSearchParamsCache(searchParams);

export const serializeSearchParams = createSerializer(searchParams, {
  processUrlSearchParams: (search) => {
    search.sort();
    return search;
  },
});
