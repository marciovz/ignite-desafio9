
import { v4 as uuidV4 } from 'uuid';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import {app} from '../../../../app';

let connection: Connection;

describe('Create a new Statement', () => {

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


  it('should be able to create a new deposit statement', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    
    const { token } = responseToken.body;

    const responseStatement  = await request(app).post('/api/v1/statements/deposit')
      .send({
        description: 'deposit of 300',
        amount: 123.45
      })
      .set({
        Authorization: `Bearer ${token}`
      })
    expect(responseStatement.status).toBe(201);
    expect(responseStatement.body).toHaveProperty('id');
    expect(responseStatement.body.type).toEqual('deposit');
    expect(responseStatement.body.amount).toEqual(123.45);
  })


  it('should not be able to create a new deposit statement with a invalid token', async () => {
    const token = 'invalid_token';

    const responseStatement  = await request(app).post('/api/v1/statements/deposit')
      .send({
        description: 'deposit of 300',
        amount: 123.45
      })
      .set({
        Authorization: `Bearer ${token}`
      })

    expect(responseStatement.status).toBe(401);
    expect(responseStatement.body).toHaveProperty('message');
    expect(responseStatement.body.message).toEqual('JWT invalid token!');
  })


  it('should be able to create a new withdraw statement', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    
    const { token } = responseToken.body;

    await request(app).post('/api/v1/statements/deposit')
      .send({
        description: 'deposit of 900',
        amount: 900
      })
      .set({
        Authorization: `Bearer ${token}`
      })


    const responseStatement = await request(app).post('/api/v1/statements/withdraw')
      .send({
        description: 'withdraw of 300',
        amount: 300
      })
      .set({
        Authorization: `Bearer ${token}`
      })      

    expect(responseStatement.status).toBe(201);
    expect(responseStatement.body).toHaveProperty('id');
    expect(responseStatement.body.type).toEqual('withdraw');
    expect(responseStatement.body.amount).toEqual(300);
  })


  it('should not be able to create a new withdraw statement with insufficient balance', async () => {
    const responseToken = await request(app).post('/api/v1/sessions').send({
      email: 'john.due@email.com',
      password: '123456'
    })    
    const { token } = responseToken.body;

    await request(app).post('/api/v1/statements/deposit')
      .send({
        description: 'deposit of 100',
        amount: 100
      })
      .set({
        Authorization: `Bearer ${token}`
      })


    const responseStatement = await request(app).post('/api/v1/statements/withdraw')
      .send({
        description: 'withdraw of 300',
        amount: 300
      })
      .set({
        Authorization: `Bearer ${token}`
      })      

    expect(responseStatement.status).toBe(400);
    expect(responseStatement.body).toHaveProperty('message');
    expect(responseStatement.body.message).toEqual('Insufficient funds');
  })

});
