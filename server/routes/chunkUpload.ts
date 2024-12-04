/** 
 * 大文件上传
 * 
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { writeDataToFile, readDataFromFile, deleteDataFromFile } from '../utils/index';

const router = express.Router();

// 存储文件上传状态的内存对象（可以替换为数据库或磁盘存储）
let uploadProgress: { [key: string]: string[] } = {}; // 记录文件的上传进度

/**
 * 上传分片预处理中间件
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
function uploadChunkMiddleWare(req: express.Request, res: express.Response, next: express.NextFunction): void | express.Response {
  // 检查上传的 Content-Type
  if(req.headers['content-type'] && !req.headers['content-type'].startsWith('multipart/form-data')) {
    return res.status(400).send('Invalid Content-Type');
  }

  // 获取分片参数
  const { chunkIndex, totalChunks, fileName } = req.body;

  // 检查分片参数是否存在
  if(!chunkIndex || !totalChunks || !fileName) {
    return res.status(400).send('Missing chunkIndex, totalChunks or fileName');
  }

  // 重命名分片文件
  const oldChunkFilePath = path.join(__dirname, '../../tmp/uploads/', `${fileName}`); // 分片文件路径
  const newChunkFilePath = path.join(__dirname, '../../tmp/uploads/', `${chunkIndex}-${fileName}`); // 分片文件路径
  fs.renameSync(oldChunkFilePath, newChunkFilePath); // 重命名分片文件

  next();
}

/**
 * 上传分片记录中间件
 * @param req 
 * @param res 
 * @param next 
 */
function uploadRecordMiddleWare(req: express.Request, res: express.Response, next: express.NextFunction): void | express.Response {
  // 获取分片参数
  const { chunkIndex, fileName } = req.body;

  // 第一次记录分片时，初始化空间
  if (!uploadProgress[fileName]) {
    uploadProgress[fileName] = [];
  }
  uploadProgress[fileName].push(chunkIndex.toString()); // 将已上传的分片添加到数组中

  // 记录分片到本地文件中（模拟数据库）
  writeDataToFile(uploadProgress);

  next();
}


/**
 * 合并分片中间件
 * @param req 
 * @param res 
 * @param next 
 */
function mergeChunkMiddleWare(req: express.Request, res: express.Response, next: express.NextFunction): void | express.Response {
  // 获取文件信息
  const { fileName, totalChunks } = req.body;

  // 拼接合并文件名
  const fileNameArr = fileName && (fileName as string).split('.');   // 文件名称分离为文件名和扩展名
  let merge_fileName = fileNameArr[0] + new Date().getTime() + '.' + fileNameArr[1]; // 文件名称采用文件名+时间戳命名，防止文件名冲突

  // 创建合并文件的路径
  const fullFilePath = path.join(__dirname, '../../tmp/uploads', merge_fileName);

  // 遍历所有分片文件，按顺序写入合并文件（文件流的形式写入）
  const writeFileStream = fs.createWriteStream(fullFilePath); // 创建写入流

  for(let i=0; i <= totalChunks - 1; i++) {
    const chunkFilePath = path.join(__dirname, '../../tmp/uploads', `${i}-${fileName}`); // 获取当前分片文件路径
    const data = fs.readFileSync(chunkFilePath); // 读取该分片文件
    writeFileStream.write(data); // 将该分片文件写入到合并文件中
    fs.unlinkSync(chunkFilePath); // 删除该分片文件
  }

  // 合并完成, 关闭写入流
  writeFileStream.end(() => {
    // 清除分片记录
    uploadProgress = {};
    // 删除分片记录
    deleteDataFromFile(fileName);


    next();
  });
}


/**
 * 分片上传接口
 */

// 初始化multer实例选项
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // 设置文件上传的路径（项目根目录下）
    const filePath = path.join(__dirname, '../../tmp/uploads/');

    // 检查目标文件夹是否存在
    if (!fs.existsSync(filePath)) {
      // 如果文件夹不存在，则创建文件夹
      fs.mkdirSync(filePath, { recursive: true }); // 使用递归创建目录
    }

    cb(null, filePath);
  },
  filename: async function(req, file, cb) { 
    cb(null, `${file.originalname}`); // 文件名
  }
})

// 解决中文名称的问题
const fileFilter = (req: any, file: any, callback: any) => {
  // 解决中文名乱码的问题 latin1 是一种编码格式
  file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
  );
  callback(null, true);
};

// 创建multer实例
const upload = multer({ 
  fileFilter,
  storage
})

/**
 * @swagger
 * /ck/upload:
 *   post:
 *     summary: 上传文件分片
 *     description: 用于上传文件的分片，每个分片需要通过该接口单独上传。
 *     tags:
 *       - Chunk File Upload
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         description: 文件分片
 *       - in: formData
 *         name: fileName
 *         type: string
 *         description: 当前上传的文件的名称（包括扩展名）
 *       - in: formData
 *         name: chunkIndex
 *         type: integer
 *         description: 当前上传的文件分片索引
 *       - in: formData
 *         name: totalChunks
 *         type: integer
 *         description: 上传的文件分片总数
 *     responses:
 *       200:
 *         description: 上传分片成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "文件分片 1 上传成功"
 *       400:
 *         description: 上传失败，缺少必需的参数
 */
router.post('/upload', upload.single('file'), uploadChunkMiddleWare as any, uploadRecordMiddleWare as any, (req, res) => {
  // 获取分片参数
  const { chunkIndex } = req.body;
  res.send({ code: 0, message: `文件分片 ${chunkIndex} 上传成功` });
});

/**
 * @swagger
 * /ck/merge:
 *   post:
 *     summary: 合并文件分片
 *     description: 合并上传的所有分片，生成完整的文件。
 *     tags:
 *       - Chunk File Upload
 *     parameters:
 *       - in: body
 *         name: 请求示例
 *         schema:
 *           type: object
 *           properties:
 *             fileName:
 *               type: string
 *               description: 文件名称（包括扩展符）
 *               example: "example-file.txt"
 *             totalChunks:
 *               type: integer
 *               description: 上传的文件分片总数
 *               example: "100"
 *     responses:
 *       200:
 *         description: 合并文件分片成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "合并完成"
 *       400:
 *         description: 合并失败，缺少分片数据
 */
router.post('/merge', mergeChunkMiddleWare as any, (req, res) => {
  res.send({ code: 0, message: `合并完成` });
});

/**
 * @swagger
 * /ck/progress:
 *   post:
 *     summary: 获取文件上传进度
 *     description: 根据文件名获取上传进度，返回已上传的文件分片信息。
 *     tags:
 *       - Chunk File Upload
 *     parameters:
 *       - in: body
 *         name: 请求示例
 *         schema:
 *           type: object
 *           properties:
 *             fileName:
 *               type: string
 *               description: 文件名称（包括扩展符）
 *               example: "example-file.txt"
 *     responses:
 *       200:
 *         description: 成功获取文件上传进度
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "获取文件上传进度成功"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: 已上传的文件分片数组
 *                   example: [0, 1, 2]
 *       400:
 *         description: 请求缺少文件名
 *       404:
 *         description: 文件未上传，找不到上传记录
 */
router.post('/progress', (req, res): any => {
  const { fileName } = req.body;

  if (!fileName) {
    return res.status(400).send('Missing fileName');
  }

  // 读取文件中的分片记录
  const data: any = readDataFromFile();

  // 检测是否有过上传记录
  if (!data[fileName]) {
    return res.send({ code: -1, message: '当前文件未上传，不存在分片记录' });
  }

  const uploadedChunks = data[fileName] || []; // 已上传的分片数组

  res.send({ 
    code: 0, 
    data: uploadedChunks,
    message: '获取文件上传进度成功' 
  });
})

// multer上传中间件错误统一处理
router.use((err: any, req: any, res: any, next: any) => {
  if(err instanceof multer.MulterError) {
    return res.status(400).send({ code: 1, message: 'Multer error: ' + err.message });
  } else if(err) {
    return res.status(500).send({ code: 1, message: 'Server error: ' + err.message });
  }
})

export default router;