"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe('create', function () {
  const newJob = {
    title: 'new job',
    salary: 50,
    equity: .001,
    companyHandle: 'c1'
  };

  const badNewJob = {
    title: 'new job',
    salary: 'invalid',
    equity: 'invalid',
    companyHandle: 'c1'
  };

  test('works', async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      id: expect.any(Number),
      title: 'new job',
      salary: 50,
      equity: "0.001",
      companyHandle: 'c1'
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE title = 'new job'`);

    expect(result.rows).toEqual([{
      id: expect.any(Number),
      title: 'new job',
      salary: 50,
      equity: "0.001",
      companyHandle: 'c1'
    }]
    );
  });


  test('fails on text as num inputs', async function () {
    try {
      let job = await Job.create(badNewJob);
      throw new Error("fail test, you shouldn't get here");

    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test('bad request with dupe', async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      throw new Error("fail test, you shouldn't get here");

    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** _filterJob */

describe('_filterJob', function () {
  test('works with no filter queries', function () {
    const queries = {};
    const resp = Job._filterJob(queries);

    expect(resp).toEqual({
      where: "", queries: [],
    });
  });

  test('works with only title', function () {
    const queries = { title: 'job1' };
    const resp = Job._filterJob(queries);

    expect(resp).toEqual({
      where: 'WHERE title ILIKE $1',
      queries: ["%job1%"]
    });
  });

  test('works with min and true equity', function () {
    const queries = { minSalary: 5, hasEquity: true };
    const resp = Job._filterJob(queries);

    expect(resp).toEqual({
      where: 'WHERE salary >= $1 AND equity > 0',
      queries: [5]
    });
  });

  test('works with all queries', function () {
    const queries = { title: 'job2', minSalary: 10, hasEquity: true };
    const resp = Job._filterJob(queries);

    expect(resp).toEqual({
      where: 'WHERE title ILIKE $1 AND salary >= $2 AND equity > 0',
      queries: ["%job2%", 10]
    });
  });

  test('works with false equity input', function () {
    const queries = { hasEquity: false };
    const resp = Job._filterJob(queries);

    expect(resp).toEqual({
      where: '',
      queries: []
    });
  });
});

/************************************** findAll */

describe('findAll', function () {
  test('works: no filter', async function () {
    let jobs = await Job.findAll();

    expect(jobs).toEqual([
      {
        id: 1,
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
      {
        id: 2,
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        id: 3,
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ]);
  });

  test('works with title filter', async function () {
    const jobs = await Job.findAll({ name: 'job1' });

    expect(jobs).toEqual([
      {
        id: 1,
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
    ]);
  });

  test('works with min and true equity', async function () {
    const jobs = await Job.findAll({ minSalary: 15, hasEquity: true });

    expect(jobs).toEqual([
      {
        id: 2,
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        id: 3,
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ]);
  });

  test('works with all queries', async function () {
    const jobs = await Job.findAll({ name: 'job', minSalary: 15, hasEquity: true });

    expect(jobs).toEqual([
      {
        id: 2,
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        id: 3,
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ]);
  });

  test('works with partial title', async function () {
    const jobs = await Job.findAll({ name: '1' });

    expect(jobs).toEqual([
      {
        id: 1,
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
    ]);
  });

  test('works with false equity', async function () {
    const jobs = await Job.findAll({ hasEquity: false });

    expect(jobs).toEqual([
      {
        id: 1,
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
      {
        id: 2,
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        id: 3,
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ]);
  });
});


/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(1);

    expect(job).toEqual({
      id: 1,
      title: 'job1',
      salary: 10,
      equity: .001,
      companyHandle: 'c1'
    });
  });

  test("not found if job does not exist", async function () {
    try {
      await Job.get("bad");
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateJob = {
    title: "new title",
    salary: 100,
    equity: 0
  };

  const updateJobNulls = {
    name: "new title",
    salary: null,
    equity: null,
  };

  test("works", async function () {
    let job = await Job.update(1, updateJob);

    expect(job).toEqual({
      id: 1,
      ...updateJob,
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
      FROM jobs
      WHERE id = 1`
    );
    expect(result.rows).toEqual([{
      id: 1,
      title: "new title",
      salary: 100,
      equity: 0,
      companyHandle: "c1",
    }]);
  });

  test("works: null fields", async function () {
    let job = await Job.update(1, updateJobNulls);
    expect(job).toEqual({
      id: 1,
      ...updateJobNulls,
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
      FROM jobs
      WHERE id = 1`
    );
    expect(result.rows).toEqual([{
      id: 1,
      title: "new title",
      salary: null,
      equity: null,
      companyHandle: "c1",
    }]);
  });

  test("not found if job does not exist", async function () {
    try {
      await Job.update("bad", updateJob);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(1, {});
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function(){
  test("works", async function(){
    await Job.remove(1);
    const result = await db.query(
      `SELECT id FROM jobs WHERE id = 1`
    );
    
    expect(result.rows.length).toEqual(0);
  });
  
  test("not found if no such job", async function () {
    try {
      await Job.remove("nope");
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
})