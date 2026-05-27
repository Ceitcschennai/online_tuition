const { MongoClient } = require("mongodb");

async function setupDatabaseGuardrails() {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();

    const collections     = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("students"))   await db.createCollection("students");
    if (!collectionNames.includes("teachers"))   await db.createCollection("teachers");
    if (!collectionNames.includes("admins"))     await db.createCollection("admins");
    if (!collectionNames.includes("assignments")) await db.createCollection("assignments");
    if (!collectionNames.includes("customers"))  await db.createCollection("customers");

    // ─────────────────────────────────────
    // STUDENTS
    // ─────────────────────────────────────
    await db.command({
      collMod: "students",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["firstName", "lastName", "email", "class"],
          properties: {
            firstName:      { bsonType: "string" },
            lastName:       { bsonType: "string" },
            email:          { bsonType: "string" },
            mobile:         { bsonType: "string" },
            class:          { bsonType: "string" },
            salutation: {
              bsonType: "string",
              enum: ["Mr.", "Ms.", "Mrs.", "Mr", "Ms", "Mrs"],
            },
            timezone: { bsonType: "string" },
            group: { bsonType: "string" },

            // ✅ FIXED: matches ALL options in StudentRegister.jsx
            syllabus: {
              bsonType: "string",
              enum: [
                "State Board",
                "CBSE",
                "ICSE",
                "Matriculation",
                "Matric",
                "IGCSE",
                "IB",
                "Other",
              ],
              description: "Must be a valid syllabus option",
            },

            emisNumber: { bsonType: "string" },

            // ✅ panNumber — format validated by Mongoose
            panNumber: {
              bsonType: "string",
              description: "Must match PAN format: ABCDE1234F",
            },

            proof: { bsonType: "string" },

            status: {
              bsonType: "string",
              enum: ["Paid", "Unpaid"],
            },

            approvalStatus: {
              bsonType: "string",
              enum: ["Pending", "Approved", "Rejected"],
            },

            registeredAt: { bsonType: "date" },

            isActive: { bsonType: "bool" },
          },
        },
      },
      validationAction: "error",
      validationLevel: "moderate", // ✅ CHANGED: "moderate" so existing docs without panNumber are not rejected
    });
    console.log("✅ Guardrail set: students");

    // ─────────────────────────────────────────────
    // TEACHERS
    // ─────────────────────────────────────────────
    await db.command({
      collMod: "teachers",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["firstName", "email", "password", "qualification"],
          properties: {
            firstName:        { bsonType: "string" },
            email:            { bsonType: "string" },
            password:         { bsonType: "string" },
            qualification: {
              bsonType: "string",
              enum: ["B.Ed", "M.Ed", "B.Sc", "M.Sc", "B.A", "M.A", "Ph.D", "Other"],
            },
            preferredSubject: { bsonType: "string" },
            mobile:           { bsonType: "string" },
            experience:       { bsonType: "int", minimum: 0 },
            isApproved:       { bsonType: "bool" },
            isActive:         { bsonType: "bool" },
          },
        },
      },
      validationAction: "error",
      validationLevel: "moderate",
    });
    console.log("✅ Guardrail set: teachers");

    // ─────────────────────────────────────────────
    // ADMINS
    // ─────────────────────────────────────────────
    await db.command({
      collMod: "admins",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["instituteName", "email", "password"],
          properties: {
            instituteName: { bsonType: "string" },
            email:         { bsonType: "string" },
            password:      { bsonType: "string" },
          },
        },
      },
      validationAction: "error",
      validationLevel: "moderate",
    });
    console.log("✅ Guardrail set: admins");

    // ─────────────────────────────────────────────
    // ASSIGNMENTS
    // ─────────────────────────────────────────────
    await db.command({
      collMod: "assignments",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["title", "subject", "class", "dueDate", "teacherId"],
          properties: {
            title:       { bsonType: "string" },
            subject:     { bsonType: "string" },
            class:       { bsonType: "string" },
            dueDate:     { bsonType: "date" },
            priority: {
              bsonType: "string",
              enum: ["Low", "Medium", "High"],
            },
            description: { bsonType: "string" },
            teacherId:   { bsonType: "objectId" },
          },
        },
      },
      validationAction: "error",
      validationLevel: "moderate",
    });
    console.log("✅ Guardrail set: assignments");

    // ─────────────────────────────────────
    // CUSTOMERS
    // ─────────────────────────────────────
    await db.command({
      collMod: "customers",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["customerId", "name", "email", "role"],
          properties: {
            customerId: { bsonType: "string" },
            name:       { bsonType: "string" },
            email:      { bsonType: "string" },
            role: {
              bsonType: "string",
              enum: ["student", "teacher", "admin"],
            },
            createdAt: { bsonType: "date" },
          },
        },
      },
      validationAction: "error",
      validationLevel: "moderate",
    });
    console.log("✅ Guardrail set: customers");

    await client.close();
    console.log("🛡️ All database guardrails deployed successfully!");

  } catch (error) {
    console.log("❌ Guardrails Error:");
    console.log(error.message);
  }
}

module.exports = setupDatabaseGuardrails;   