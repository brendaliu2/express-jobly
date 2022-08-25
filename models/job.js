"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job{
  /** Create a job (from data), insert into db, and return new job data.
   * 
   * Input: {title, salary, equity, companyHandle }
   * 
   * Output: {id, title, salary, equity, companyHandle }
   * 
   * Throws BadRequestError if position already exists in company (in database)
   */
  
  static async create({ title, salary, equity, companyHandle }){
    const duplicateCheck = await db.query(
      `SELECT title, company_handle
      FROM jobs
      WHERE title = $1 AND company_handle = $2`,
      [title, companyHandle]
    );
    
    if(duplicateCheck.rows[0]) {
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
  
  /**Builds a WHERE sql TODO: */
  
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
  
  
}

module.exports = Job;