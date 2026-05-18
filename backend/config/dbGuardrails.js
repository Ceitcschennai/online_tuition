const { MongoClient } = require('mongodb');

async function setupDatabaseGuardrails() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  // Extract your DB name from the URI
  const db = client.db();

  // ─── STUDENTS ───────────────────────────────────────
  await db.command({
    collMod: 'students',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['firstName', 'lastName', 'email', 'class'],
        properties: {
          firstName:      { bsonType: 'string',  description: 'required string' },
          lastName:       { bsonType: 'string',  description: 'required string' },
          email:          { bsonType: 'string',  description: 'required string' },
          mobile:         { bsonType: 'string',  description: 'must be a string' },
          class:          { bsonType: 'string',  description: 'required string' },
          status:         { bsonType: 'string',  enum: ['Paid', 'Unpaid'] },
          approvalStatus: { bsonType: 'string',  enum: ['Pending', 'Approved', 'Rejected'] },
          isActive:       { bsonType: 'bool' }
        }
      }
    },
    validationAction: 'error',
    validationLevel: 'strict'
  });
  console.log('✅ Guardrail set: students');

  // ─── TEACHERS ───────────────────────────────────────
  await db.command({
    collMod: 'teachers',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['firstName', 'email', 'password', 'qualification'],
        properties: {
          firstName:     { bsonType: 'string', description: 'required string' },
          email:         { bsonType: 'string', description: 'required string' },
          password:      { bsonType: 'string', description: 'required string' },
          qualification: { bsonType: 'string', description: 'required string' },
          mobile:        { bsonType: 'string', description: 'must be a string' },
          experience:    { bsonType: 'int',    minimum: 0 },
          isApproved:    { bsonType: 'bool' },
          isActive:      { bsonType: 'bool' }
        }
      }
    },
    validationAction: 'error',
    validationLevel: 'strict'
  });
  console.log('✅ Guardrail set: teachers');

  // ─── ADMINS ─────────────────────────────────────────
  await db.command({
    collMod: 'admins',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['instituteName', 'email', 'password'],
        properties: {
          instituteName: { bsonType: 'string', description: 'required string' },
          email:         { bsonType: 'string', description: 'required string' },
          password:      { bsonType: 'string', description: 'required string' }
        }
      }
    },
    validationAction: 'error',
    validationLevel: 'strict'
  });
  console.log('✅ Guardrail set: admins');

  // ─── ASSIGNMENTS ────────────────────────────────────
  await db.command({
    collMod: 'assignments',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['title', 'subject', 'class', 'dueDate', 'teacherId'],
        properties: {
          title:       { bsonType: 'string',   description: 'required string' },
          subject:     { bsonType: 'string',   description: 'required string' },
          class:       { bsonType: 'string',   description: 'required string' },
          dueDate:     { bsonType: 'date',     description: 'required date' },
          priority:    { bsonType: 'string',   enum: ['Low', 'Medium', 'High'] },
          description: { bsonType: 'string' },
          teacherId:   { bsonType: 'objectId', description: 'required objectId' }
        }
      }
    },
    validationAction: 'error',
    validationLevel: 'strict'
  });
  console.log('✅ Guardrail set: assignments');

  await client.close();
  console.log('🛡️ All database guardrails deployed successfully!');
}

module.exports = setupDatabaseGuardrails;