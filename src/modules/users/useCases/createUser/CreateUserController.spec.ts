import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import { app } from '../../../../app';

let connection: Connection;

describe('Create User Controller', () => {

  beforeAll(async () => {
    connection = await createConnection();
  });

  beforeEach( async () => {
    await connection.dropDatabase();
    await connection.runMigrations();
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  })


  it('should be able to create a new user', async () => {
    const response = await request(app).post('/api/v1/users').send({
      name: 'John Due',
      email: 'john.due@email.com',
      password: '123456'
    })

    expect(response.status).toBe(201);
  });


  it('should not be able to create a new user with duplicate email', async () => {
    await request(app).post('/api/v1/users').send({
      name: 'John Due',
      email: 'john.due@email.com',
      password: '123456'
    })

    const response = await request(app).post('/api/v1/users').send({
      name: 'Other John Due',
      email: 'john.due@email.com',
      password: '654321'
    })

    expect(response.status).toBe(400);
  });

});