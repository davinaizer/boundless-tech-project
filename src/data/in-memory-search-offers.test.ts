import { describeSearchOffersContract } from "@/domain/search-offers.contract";
import { createInMemorySearchOffers } from "./in-memory-search-offers";

describeSearchOffersContract("in-memory adapter", async (offers) =>
  createInMemorySearchOffers(offers),
);
