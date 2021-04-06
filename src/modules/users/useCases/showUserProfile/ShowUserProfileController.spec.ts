
import { v4 as uuidV4 } from 'uuid';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import {app} from '../../../../app';

let connection: Connection;

describe('Return the profile', () => {

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


  it('should be able to get the profile by token', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    
    const { token } = responseToken.body

    const responseProfile  = await request(app).get('/api/v1/profile')
      .set({
        Authorization: `Bearer ${token}`
      })

    expect(responseProfile.status).toBe(200);
    expect(responseProfile.body).toHaveProperty('id');
    expect(responseProfile.body.email).toEqual('john.due@email.com')
  })


  it('should not be able to get the profile by invalid token', async () => {
    await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    

    const token = 'invalid_token';

    const responseProfile  = await request(app).get('/api/v1/profile')
      .set({
        Authorization: `Bearer ${token}`
      })

    expect(responseProfile.status).toBe(401);
    expect(responseProfile.body).toHaveProperty('message');
    expect(responseProfile.body.message).toEqual('JWT invalid token!');
  })

});