"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

const router = new express.Router();

/** POST / { job } => { job }
 * 
 * Input: {title, salary, equity, companyHandle}
 * 
 * Output: {job: {id, title, salary, equity, companyHandle}
 * 
 * Authorization required: admin
 */
router.post('/', ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    jobNewSchema,
    { required: true }
  );

  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET / => 
 *  { jobs: [{ id, title, salary, equity, companyHandle }]}
 * 
 * Can filter on provided search filters (in query string):
 * -title (partial matches and case-insensitive)
 * -minSalary
 * -hasEquity
 * 
 * Authorization required: none
 */
router.get('/', async function (req, res, next) {
  const q = req.query;
  if (q.minSalary) q.minSalary = +q.minSalary;
  if (q.hasEquity === 'true') {
    q.hasEquity = true;
  } else if (q.hasEquity === 'false') {
    q.hasEquity = false;
  }

  const validator = jsonschema.validate(
    q,
    jobSearchSchema,
    { required: true }
  );

  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.findAll(q);
  return res.json({ jobs });
});

/**GET /[id] => { job }
 * 
 * Output: { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: none
 */
router.get('/:id', async function (req, res, next) {
  const job = await Job.get(req.params.id);
  return res.json({ job });
});

/** PATCH /[id] {fld1, fld2, ...} => { job }
 * 
 * Patches job data
 * 
 * Input: id, {title, salary, equity} 
 *  Will throw BadRequest if submit id or companyHandle in req.body
 * 
 * Output: {job: {id, title, salary, equity, companyHandle}}
 * 
 * Authorization required: admin
 */

router.patch('/:id', ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    jobUpdateSchema,
    { required: true }
  );

  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(req.params.id, req.body);
  return res.json({ job });
});

/**DELETE /[id] =>  { deleted: id }
 * 
 * Authorization required: admin
*/
router.delete('/:id', ensureAdmin, async function (req, res, next) {
  await Job.remove(req.params.id);
  return res.json({ deleted: req.params.id });
});

module.exports = router;