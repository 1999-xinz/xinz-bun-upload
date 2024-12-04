import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'xinz-bun-upload',
      version: '1.0.0',
      description: 'API documentation for xinz-bun-upload',
    },
  },
  // 指定路由文件的路径
  apis: [path.join(__dirname, '../routes/*.ts')], 
};

const openapiSpecification = swaggerJsdoc(options);
 
export default openapiSpecification;