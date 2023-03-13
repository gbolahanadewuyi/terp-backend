const {body} = require("express-validator");

exports.validate = (method)=>{
  switch (method) {
    case "createUser": {
      return [
        body("firstName", "firstname doesnt exists").exists(),
        body("lastName", "lastname doesnt exists").exists(),
        body("email", "Invalid email").exists().isEmail(),
        body("password", "Password must be more than 5 characters").exists().isLength({min: 5}),
        body("role").exists().isIn(["Admin", "Other"]),
      ];
    }
    case "Login": {
      return [
        body("email", "Please enter an email").exists(),
        body("password", "Please enter your password").exists(),
      ];
    }
  }
};
