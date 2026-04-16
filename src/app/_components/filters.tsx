"use client";

import { useQueryStates } from "nuqs";
import { searchParams } from "~/lib/search-configs";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  offenseCodeOptions,
  offenseNamesByYearAndCode,
  yearOptions,
} from "~/lib/options.generated";
import { months } from "~/constants/month";
import { Button } from "~/components/ui/button";

export default function Filters() {
  const [filters, setFilters] = useQueryStates(searchParams, { shallow: false });

  const formatMonth = (month: string) => {
    if (month === "all") return "All Months";
    return `${month} - ${months[month as keyof typeof months]}`;
  };

  const formatOffenseCode = (year: number, offenseCode: string) => {
    if (offenseCode === "all") return "All Offense Types";
    const yearKey = String(year) as keyof typeof offenseNamesByYearAndCode;
    const name =
      offenseNamesByYearAndCode[yearKey][
        offenseCode as keyof (typeof offenseNamesByYearAndCode)[typeof yearKey]
      ];
    return `${offenseCode} - ${name}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button onClick={() => setFilters({ year: null, month: null, offenseCode: null })}>
          Clear Filters
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-muted-foreground">Year</Label>
        <Select
          value={filters.year}
          onValueChange={(value) => setFilters({ ...filters, year: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-muted-foreground">Month</Label>
        <Select
          value={filters.month}
          onValueChange={(value) => setFilters({ ...filters, month: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a month" />
          </SelectTrigger>
          <SelectContent>
            {["all", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((month) => (
              <SelectItem key={month} value={month}>
                {formatMonth(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-muted-foreground">Offense Type</Label>
        <Select
          value={filters.offenseCode}
          onValueChange={(value) => setFilters({ ...filters, offenseCode: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an offense code" />
          </SelectTrigger>
          <SelectContent>
            {offenseCodeOptions.map((offenseCode) => (
              <SelectItem key={offenseCode} value={offenseCode}>
                {formatOffenseCode(filters.year, offenseCode)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
