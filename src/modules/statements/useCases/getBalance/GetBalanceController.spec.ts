
import { v4 as uuidV4 } from 'uuid';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import {app} from '../../../../app';

let connection: Connection;

describe('Return the balance of a user', () => {

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


  it('should be able to get balance of the user', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    
    const { token } = responseToken.body;

    await request(app).post('/api/v1/statements/deposit')
      .send({
        description: 'deposit of 950.35',
        amount: 950.35
      })
      .set({
        Authorization: `Bearer ${token}`
      })

    await request(app).post('/api/v1/statements/withdraw')
      .send({
        description: 'withdraw of 420.10',
        amount: 420.10
      })
      .set({
        Authorization: `Bearer ${token}`
      })
            
    const responseBalance = await request(app).get('/api/v1/statements/balance').set({
      Authorization: `Bearer ${token}`
    })  

    expect(responseBalance.status).toBe(200);
    expect(responseBalance.body).toHaveProperty('balance');
    expect(responseBalance.body.balance).toEqual(530.25);
    expect(responseBalance.body).toHaveProperty('statement');
    expect(responseBalance.body.statement.length).toBe(2);
  })


  it('should not be able to get balance with a invalid token', async () => {  
    const token = 'invalid_token';
     
    const responseBalance = await request(app).get('/api/v1/statements/balance').set({
      Authorization: `Bearer ${token}`
    })  

    expect(responseBalance.status).toBe(401);
    expect(responseBalance.body).toHaveProperty('message');
    expect(responseBalance.body.message).toEqual('JWT invalid token!');
  })
});
