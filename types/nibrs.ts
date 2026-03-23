export type NibrsManifestYear = {
  year: number;
  path: string;
  agencies: number;
  incidents: number;
  offenses: number;
  updatedAt: string;
};

export type NibrsManifest = {
  generatedAt: string;
  years: NibrsManifestYear[];
};

export type NibrsYearRecord = {
  month: number;
  agencyId: string;
  agencyName: string;
  countyName: string;
  offenseCode: string;
  offenseName: string;
  offenseCategoryName: string;
  offenseGroup: string;
  crimeAgainst: string;
  incidentCount: number;
  offenseCount: number;
};

export type NibrsYearDataset = {
  year: number;
  generatedAt: string;
  summary: {
    agencies: number;
    incidents: number;
    offenses: number;
    topAgency: null | {
      agencyId: string;
      agencyName: string;
      countyName: string;
      incidentCount: number;
      offenseCount: number;
    };
    topOffense: null | {
      offenseCode: string;
      offenseName: string;
      incidentCount: number;
      offenseCount: number;
    };
  };
  monthlyTrend: Array<{
    month: number;
    incidentCount: number;
    offenseCount: number;
  }>;
  agencyBreakdown: Array<{
    agencyId: string;
    agencyName: string;
    countyName: string;
    incidentCount: number;
    offenseCount: number;
  }>;
  offenseBreakdown: Array<{
    offenseCode: string;
    offenseName: string;
    offenseCategoryName: string;
    offenseGroup: string;
    crimeAgainst: string;
    incidentCount: number;
    offenseCount: number;
  }>;
  records: NibrsYearRecord[];
};
