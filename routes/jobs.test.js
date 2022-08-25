"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  j1, j2, j3,
} = require("./_testCommon");
const { UnauthorizedError, NotFoundError } = require("../expressError");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/****************************************** POST /jobs */

describe("POST /jobs", function(){
  const newJob = {
    title: "new title",
    salary: 5,
    equity: 0.2,
    companyHandle: "c1"
  };
  
  test("okay for authorized user", async function(){
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "new title",
        salary: 5,
        equity: "0.2",
        companyHandle: "c1"
      },
    });
  });
  
  test("fails for unauthorized user", async function(){
    try{
      const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u2Token}`);
    } catch (err) {
      expect(err.status).toEqual(401);
      expect(err instanceof UnauthorizedError).toBeTruthy();
    }
  });
  
  test("fails with missing data", async function(){
    const resp = await request(app)
      .post("/jobs")
      .send({title: "engineer"})
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
  
  test("fails with invalid", async function(){
    const resp = await request(app)
      .post("/jobs")
      .send({title: "engineer", 
            salary: "nothing", 
            equity: 0.5,
            companyHandle: "c1"})
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
})

/************************************** GET /jobs */

describe("GET /jobs", function(){
  test("ok for anon and no filtering", async function(){
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({ jobs: [ j1, j2, j3] });
  });

  test("works: title in query string", async function(){
    const resp = await request(app).get("/jobs?title=j1");
    expect(resp.body).toEqual({jobs: [j1]});
  });
  
  test("works: partial title in query string", async function(){
    const resp = await request(app).get("/jobs?title=j");
    expect(resp.body).toEqual({jobs: [j1, j2, j3]});
  });
  
  test("works: minSalary and hasEquity in query string", async function(){
    const resp = await request(app).get("/jobs?minSalary=5&hasEquity=true");
    expect(resp.body).toEqual({jobs: [j2,j3]});
  });
  
  test("works: all criteria in query string", async function(){
    const resp = await request(app).get("/jobs?title=j&minSalary=2&hasEquity=true");
    expect(resp.body).toEqual({jobs: [j2, j3]});
  });
  
  test("works: hasEquity is false", async function(){
    const resp = await request(app).get("/jobs?hasEquity=false");
    expect(resp.body).toEqual({jobs: [j1,j2,j3]});
  });
  
  test("fails: salary input not a number", async function(){
    try{
      await request(app).get("/jobs?minSalary=five");
    } catch (err) {
      expect(err.status).toEqual(400);
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
  
  test("fails: invalid query string", async function (){
    try{
      await request(app).get("/jobs?invalid=five");
    } catch (err) {
      expect(err.status).toEqual(400);
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
})

/******************************************* GET /jobs/:id */

describe("GET /jobs/:id", function(){
  test("works for anon", async function(){
    const resp = await request(app).get(`/jobs/${j1.id}`);
    expect(resp.body).toEqual({ job: j1 });
  });
  
  test("not found for nonexisting job", async function(){
    const resp = await request(app).get("/jobs/0");
    expect(resp.statusCode).toEqual(404);
  });
})

/********************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function(){
  test("works for authorized user", async function(){
    const resp = await request(app)
      .patch(`/jobs/${j1.id}`)
      .send({title: "j1-new"})
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      job: {
        id: j1.id,
        title: "j1-new",
        salary: j1.salary,
        equity: j1.equity,
        companyHandle: j1.companyHandle
      },
    });
  })
  
  test("fails for unauthorized user", async function(){
    const resp = await request(app)
        .patch(`/jobs/${j1.id}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  })
  
  test("fails for anon"), async function(){
    const resp = await request(app)
        .patch(`/jobs/${j1.id}`)
        .send({
          title: "j1-new",
        });
    expect(resp.statusCode).toEqual(401);
  }
  
  test("fails for nonexisting job", async function(){
    try{
      await request(app)
        .patch("/jobs/0")
        .send({title: "j1-new"})
        .set("authorization", `Bearer ${u1Token}`);
      throw new Error("you shouldn't be here!");
    } catch(err){
      expect(err.status).toEqual(404);
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  })
  
  test("bad request on company change attempt", async function(){
    const resp = await request(app)
      .patch(`/jobs/${j1.id}`)
      .send({companyHandle: "c2"})
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  })
  
  test("bad request on id change attempt", async function(){
    const resp = await request(app)
      .patch(`/jobs/${j1.id}`)
      .send({id: 40000})
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
  
  test("bad request on invalid data", async function(){
    const resp = await request(app)
      .patch(`/jobs/${j1.id}`)
      .send({salary: "not-a-number"})
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  })
})


/****************************************** DELETE /job/:id */

describe("DELETE /jobs/:id", function(){
  test("works for authorized users", async function(){
    const resp = await request(app)
      .delete(`/jobs/${j1.id}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "j1"});
  });
  
  test("fails for anon", async function(){
    const resp = await request(app)
      .delete(`/jobs/${j1.id}`);
    expect(resp.statusCode).toEqual(401);
  })
  
  test("fails for unauthorized user", async function(){
    const resp = await request(app)
      .delete(`/jobs/${j1.id}`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  })
  
  test("not found on nonexisting user", async function(){
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  })
})