const { BadRequestError } = require("../expressError");

/* Helper Function for updating company and user models
* Converts object keys into SQL column name format
* Input: {key:value} => {setCols: ... values: ...}
*
* Example:
* {firstName: 'Aliya', age: 32} => {setCols:"first_name"=$1', '"age"=$2',
                                    values: ["Aliya", 32]
* 
*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");


  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };


//TODO: Questions: how to read html coverage, // noinspection SqlWithoutWhere