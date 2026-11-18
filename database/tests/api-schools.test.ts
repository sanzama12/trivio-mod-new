import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { V1CatalogController } from "../../src/controllers/v1/catalog.controller";
import { catalogService } from "../../src/services/catalog.service";

test("v1 schools API forwards major filters to the database-backed search", async (t) => {
  const search = t.mock.method(catalogService, "searchSchools", async () => ({
    items: [], total: 0, page: 2, pageCount: 1,
  }));
  const request = new NextRequest("http://localhost:3000/api/v1/schools?majorId=it&majorQuery=7480201&page=2&limit=5");
  const response = await V1CatalogController.schools(request);
  assert.equal(response.status, 200);
  assert.deepEqual(search.mock.calls[0].arguments[0], {
    q: undefined, region: undefined, type: undefined, city: undefined,
    majorId: "it", majorQuery: "7480201", page: 2, limit: 5,
  });
  assert.deepEqual((await response.json()).data, []);
});
