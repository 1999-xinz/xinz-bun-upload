/** 
 * 通用普通文件上传
 * 
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 获取express的路由实例
const router = express.Router();

// 设置文件上传的存储方式
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // 设置文件上传的路径（项目根目录下）
    const filePath = path.join(__dirname, '../../tmp/uploads');

    // 检查目标文件夹是否存在
    if (!fs.existsSync(filePath)) {
      // 如果文件夹不存在，则创建文件夹
      fs.mkdirSync(filePath, { recursive: true }); // 使用递归创建目录
    }

    cb(null, filePath);
  },
  filename: function(req, file, cb) {
    // 设置文件名，使用当前时间戳和原始文件名
    const fileName = Date.now() + '_' + file.originalname;
    
    cb(null, fileName);
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

// 获取multer实例，设置文件上传的格式和限制文件的大小
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500 // 限制文件大小为500MB
  }
})

/**
 * @swagger
 * /cn/upload:
 *   post:
 *     summary: 通用普通上传文件
 *     description: 普通上传单个文件，返回上传成功的信息和文件详情。
 *     tags:
 *       - Common File Upload
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         description: 需要上传的文件
 *     responses:
 *       200:
 *         description: 文件上传成功
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
 *                   example: "上传成功"
 *                 file:
 *                   type: object
 *                   properties:
 *                     fieldname:
 *                       type: string
 *                       example: "file"
 *                     originalname:
 *                       type: string
 *                       example: "example.txt"
 *                     encoding:
 *                       type: string
 *                       example: "7bit"
 *                     mimetype:
 *                       type: string
 *                       example: "text/plain"
 *                     destination:
 *                       type: string
 *                       example: "/uploads/"
 *                     filename:
 *                       type: string
 *                       example: "example-1617271847607.txt"
 *                     path:
 *                       type: string
 *                       example: "/uploads/example-1617271847607.txt"
 *                     size:
 *                       type: integer
 *                       example: 1024
 *       400:
 *         description: 上传失败，缺少文件参数
 *       500:
 *         description: 服务器错误
 */
router.post('/upload', upload.single('file'), (req, res) => {
  res.send({ code: 0, message: '上传成功', file: req.file });
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


