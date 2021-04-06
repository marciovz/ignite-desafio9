import { v4 as uuidV4 } from 'uuid';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import {app} from '../../../../app';

let connection: Connection;

describe('Create session authenticated', () => {

  beforeAll(async () => {
    connection = await createConnection();
  });
  
  beforeEach(async () => {
    await connection.dropDatabase();
    await connection.runMigrations();

    const id = uuidV4();
    const password = await hash('123456', 8);

    await connection.query(
      `INSERT INTO USERS(id, name, email, password, created_at, updated_at)
        values('${id}', 'John Due', 'john.due@email.com', '${password}', 'now()', 'now()')
      `
    )
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });


  it('should be able to create a session', async () => {
    const response = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  })


  it('should not be able to create a session with a invalid email', async () => {
    const response = await request(app).post('/api/v1/sessions').send({
      email: 'invalid',
      password: '123456'
    })
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toEqual('Incorrect email or password');
  })


  it('should not be able to create a session with a invalid password', async () => {
    const response = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: 'invalid'
    })
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toEqual('Incorrect email or password');
  })
});