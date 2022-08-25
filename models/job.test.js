"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
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

describe('create', function() {
  const newJob = {
    title: 'new job',
    salary: 50,
    equity: .001,
    companyHandle: 'c1'
  }
  
  const badNewJob = {
    title: 'new job',
    salary: 'invalid',
    equity: 'invalid',
    companyHandle: 'c1'
  }
  
  test('works', async function(){
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);
    
    const result = await db.query(
      `SELECT title, salary, equity, company_handle
      FROM jobs
      WHERE title = 'new'`);
      
    expect(result.rows).toEqual([{
        title: 'new job',
        salary: 50,
        equity: .001,
        companyHandle: 'c1'
      }]
    )
  })
  
  
  test('fails on text as num inputs', async function (){
    try{
      let job = await Job.create(badNewJob);
      throw new Error("fail test, you shouldn't get here");
      
    } catch (err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  })
  
  test('bad request with dupe', async function (){
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      throw new Error("fail test, you shouldn't get here");
      
    } catch (err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  })
})

/************************************** _filterJob */

describe('_filterJob', function() {
  test('works with no filter queries', function(){
    const queries = {};
    const resp = Job._filterJob(queries);
    
    expect(resp).toEqual({
      where: "", queries: [],
    });
  });
  
  test('works with only title', function() {
    const queries = {title: 'job1'};
    const resp = Job._filterJob(queries);
    
    expect(resp).toEqual({
      where: 'WHERE title ILIKE $1',
      queries: ["%job1%"]
    })
  })
  
  test('works with min and true equity', function() {
    const queries = {minSalary: 5, hasEquity: true};
    const resp = Job._filterJob(queries);
    
    expect(resp).toEqual({
      where: 'WHERE salary >= $1 AND equity >= 0',
      queries: [5]
    })
  })
  
  test('works with all queries', function() {
    const queries = {name: 'job2', minSalary: 10, hasEquity: true};
    const resp = Job._filterCompany(queries);
    
    expect(resp).toEqual({
      where: 'WHERE name ILIKE $1 AND salary >= $2 AND equity >= 0',
      queries: ["%job2%", 10]
    })
  })
  
  test('works with false equity input', function (){
    const queries = {hasEquity: false};
    const resp = Job._filterJob(queries);
    
    expect(resp).toEqual({
      where: '',
      queries: []
    })
  })
})

/************************************** findAll */

describe('findAll', function() {
  test('works: no filter', async function() {
    let jobs = await Job.findAll();
    
    expect(jobs).toEqual([
      {
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
      {
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ])
  })
  
  test('works with title filter', function() {
    const jobs = await Job.findAll({name:'job1'});
    
    expect(jobs).toEqual([
      {
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
    ])
  })
  
  test('works with min and true equity', function () {
    const jobs = await Job.findAll({minSalary: 15, hasEquity: true});
    
    expect(jobs).toEqual([
      {
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ])
  })
  
  test('works with all queries', function (){
    const jobs = await Job.findAll({name: 'job', minSalary: 15, hasEquity: true});
    
    expect(jobs).toEqual([
      {
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ])
  })
  
  test('works with partial title', function () {
    const jobs = await Job.findAll({name:'1'});
    
    expect(jobs).toEqual([
      {
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
    ])
  })
  
  test('works with false equity', function() {
    const jobs = await Job.findAll({hasEquity:false});
    
    expect(jobs).toEqual([
      {
        title: 'job1',
        salary: 10,
        equity: .001,
        companyHandle: 'c1'
      },
      {
        title: 'job2',
        salary: 15,
        equity: .050,
        companyHandle: 'c2'
      },
      {
        title: 'job3',
        salary: 20,
        equity: 1.0,
        companyHandle: 'c3'
      },
    ])
  })
})