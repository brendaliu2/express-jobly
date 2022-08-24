"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Builds a WHERE sql statement created by filter queries on company search
   * route to be used on Company.findAll() method.
   * 
   * Filter can equal an object containing case-insensitive name, minEmployees,
   * and maxEmployees. 
   * 
   * Returns either empty string if no queries or WHERE name ILIKE ... 
   * AND minEmployees >= ... AND maxEmployees <= ...    */
  

  static _filterCompany({ name, minEmployees, maxEmployees }) {
    let whereStatement = [];
    let queries = [];

    if (name) {
      queries.push(`%${name}%`);
      whereStatement.push(`name ILIKE $${queries.length}`);
    }

    if (minEmployees) {
      queries.push(minEmployees);
      whereStatement.push(`num_employees >= $${queries.length}`);
    }

    if (maxEmployees) {
      queries.push(maxEmployees)
      whereStatement.push(`num_employees <= $${queries.length}`);
    }

    const where = (whereStatement.length > 0) ?
      "WHERE " + whereStatement.join(" AND ")
      : "";

    return { where, queries };
  }

  /** Find all companies with optional filtering.
   * 
   * filter can equal an object containing case-insensitive name, minEmployees,
   * and maxEmployees. If filter search includes a minEmployee larger than a 
   * maxEmployee, an error is thrown.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * QUESTION ON CODE REVIEW: why doess white space in q-string need to be %20 not +
   * */

  static async findAll(filter = {}) {

    const { name, minEmployees, maxEmployees } = filter;

    if (maxEmployees && +minEmployees > +maxEmployees) {
      throw new BadRequestError(`Minimum employee filter must be less than 
        maximum employee filter. Please change your search accordingly.`);
    }

    const { where, queries } = this._filterCompany({ name, minEmployees, maxEmployees });
    const companiesRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           ${where}
           ORDER BY name`, queries);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
