"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), insert into db, and return new job data.
   * 
   * Input: {title, salary, equity, companyHandle }
   * 
   * Output: {id, title, salary, equity, companyHandle }
   * 
   * Throws BadRequestError if position already exists in company (in database)
   */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `SELECT title, company_handle
      FROM jobs
      WHERE title = $1 AND company_handle = $2`,
      [title, companyHandle]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Opening for ${title} at ${companyHandle} exists.`);
    }

    const result = await db.query(
      `INSERT INTO jobs(
        title,
        salary,
        equity, 
        company_handle)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );

    const job = result.rows[0];

    return job;
  }

  /**Builds a WHERE sql statement by filter queries on job search route to be 
   * used on Job.findAll() method.
   * 
   * Filter can equal an object containing case-insensitive title, minSalary, 
   * and hasEquity
   * 
   * Returns either empty string if no queries or WHERE title ILIKE...
   * AND salary >= ... AND equity >=0 (if equity is true)
   */

  static _filterJob({ title, minSalary, hasEquity }) {
    let whereStatement = [];
    let queries = [];

    if (title) {
      queries.push(`%${title}%`);
      whereStatement.push(`title ILIKE $${queries.length}`);
    }

    if (minSalary) {
      queries.push(minSalary);
      whereStatement.push(`salary >= $${queries.length}`);
    }

    if (hasEquity) {
      whereStatement.push(`equity > 0`);
    }

    const where = (whereStatement.length > 0) ?
      "WHERE " + whereStatement.join(" AND ")
      : "";

    return { where, queries };
  }

  /**Find all jobs with optional filtering
   * 
   * Input: {title:..., minSalary:..., hasEquity: ...}
   * 
   * Output: [{id, title, salary, equity, companyHandle}]
   */
  static async findAll(filter = {}) {
    const { title, minSalary, hasEquity } = filter;

    const { where, queries } = this._filterJob({ title, minSalary, hasEquity });
    const jobsRes = await db.query(`
      SELECT id,
            title,
            salary,
            equity,
            company_handle as "companyHandle"
      FROM jobs
     ${where}`, queries);

    return jobsRes.rows;
  }

  /**Give a job id, return data about job
   * 
   * Output: {id, title, salary, equity, companyHandle}
   * 
   * Throws NotFoundError if not found.
   */
  static async get(id) {
    const results = await db.query(`
      SELECT id,
            title,
            salary,
            equity,
            company_handle as "companyHandle"
      FROM jobs
      WHERE id = $1`, [id]);

    if (!results.rows[0]) throw new NotFoundError('Job not found!');

    return results.rows[0];
  }

  /** Update job data with 'data'
   * 
   * This is a 'partial update' -- will only update field that are provided
   * 
   * Input: id, {title, salary, equity}
   * 
   * Output: {id, title, salary, equity, companyHandle}
   * 
   * Throws NotFoundError if not found.
  */
  static async update(id, data) {
    if (data.companyHandle || data.id) 
      throw new BadRequestError("Invalid data.");
    
    const { setCols, values } = sqlForPartialUpdate(data, {});

    const idIdx = `$${values.length + 1}`;

    const querySQL = `
      UPDATE jobs
      SET ${setCols}
        WHERE id = ${idIdx}
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;

    const result = await db.query(querySQL, [...values, id]);
    const job = result.rows[0];
    
    if (!job) throw new NotFoundError(`No job with id: ${id}`);
    
    return job;
  }

  /** Delete job based on given id, returns undefined
   * 
   * If cannot find job, throws NotFoundError
   */
  static async remove(id){
    const results = await db.query(`
      DELETE
        FROM jobs
        WHERE id = $1
        RETURNING id`, [id]);
    
    const job = results.rows[0];
    
    if(!job) throw new NotFoundError(`No job with id: ${id}`);
  }
}

module.exports = Job;