
const { sqlForPartialUpdate } = require("./sql");



describe("sql partial update", function () {
  test("works: converts obj to sql", function () {
    
    const {setCols, values} = sqlForPartialUpdate({firstName: 'Aliya', age: 32},{
      firstName: "first_name",
      age: "age",
    })
    
    expect(setCols).toEqual("\"first_name\"=$1, \"age\"=$2")
    expect(values).toEqual(["Aliya", 32])
  });

  test("throw error on invalid first input", function () {   
    try{
      const resp = sqlForPartialUpdate({},{
        firstName: "first_name",
        age: "age",
      })

    } catch (err){
      expect(err.message).toBe("No data")
    }
  });
  
  test("throw error on invalid second input", function () {   
    try{
      const resp = sqlForPartialUpdate({firstName: 'Aliya', age: 32},{})

    } catch (err){
      expect(err.message).toBe("No data")
    }
  });
})

