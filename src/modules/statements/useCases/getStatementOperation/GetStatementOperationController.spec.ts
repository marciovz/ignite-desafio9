
import { v4 as uuidV4 } from 'uuid';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import {app} from '../../../../app';

let connection: Connection;

describe('Return a Statement Operation of a user', () => {

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


  it('should be able to get a statement of a user', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    
    const { token } = responseToken.body;

    const statement = await request(app).post('/api/v1/statements/deposit')
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

    const responseStatement = await request(app).get(`/api/v1/statements/${statement.body.id}`).set({
      Authorization: `Bearer ${token}`
    })  

    expect(responseStatement.status).toBe(200);
    expect(responseStatement.body).toHaveProperty('id');
    expect(responseStatement.body.type).toBe('deposit');
  })



  it('should not be able to get a statement of an invalid user', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })  
    
    const { token } = responseToken.body;
    const token_invalid = 'invalid_token';

    const statement = await request(app).post('/api/v1/statements/deposit')
      .send({
        description: 'deposit of 950.35',
        amount: 950.35
      })
      .set({
        Authorization: `Bearer ${token}`
      })
           
    const responseStatement = await request(app).get(`/api/v1/statements/${statement.body.id}`).set({
      Authorization: `Bearer ${token_invalid}`
    })  

    expect(responseStatement.status).toBe(401);
    expect(responseStatement.body).toHaveProperty('message');
    expect(responseStatement.body.message).toBe('JWT invalid token!');
  })


  it('should not be able to get a statement of an invalid statementId', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })  
    const { token } = responseToken.body;
    
    const invalid_statement = uuidV4();
          
    const responseStatement = await request(app).get(`/api/v1/statements/${invalid_statement}`).set({
      Authorization: `Bearer ${token}`
    })  
    
    expect(responseStatement.status).toBe(404);
    expect(responseStatement.body).toHaveProperty('message');
    expect(responseStatement.body.message).toBe('Statement not found');
  })

});
