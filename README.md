# LiveATC Caption Backend

这是一个用于获取和管理LiveATC音频频道元数据的后端服务。该服务提供了一个RESTful API接口，用于检索机场信息和相关的音频频道数据。

## 技术栈

- **Python 3.11+**
- **FastAPI** - 现代、快速的Web框架
- **Supabase** - 开源的Firebase替代品，用于数据存储
- **BeautifulSoup4** - 用于网页解析
- **HTTPX** - 异步HTTP客户端
- **Pydantic** - 数据验证
- **Uvicorn** - ASGI服务器

## 环境要求

- Python 3.11 或更高版本
- Supabase 账号和项目
- Conda 包管理工具

## 环境配置

1. 克隆项目

```bash
git clone <repository-url>
cd liveatc-caption
```

2. 创建并激活Conda虚拟环境

```bash
conda create -n liveatc python=3.11
conda activate liveatc
```

3. 安装uv包管理工具

```bash
conda install -c conda-forge uv
```

4. 安装项目依赖

```bash
cd liveatc_backend
uv pip install -e .
```

5. 配置环境变量

创建 `.env` 文件并添加以下配置：

```env
# Supabase配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_api_key

# 服务配置
HOST=0.0.0.0
PORT=8000

# 开发环境配置
DEBUG=true
ENVIRONMENT=development
```

## 启动服务

```bash
uvicorn liveatc_backend.main:app --reload
```

服务将在 http://localhost:8000 启动，API文档可在 http://localhost:8000/docs 访问。

## 开发

### 安装开发依赖

```bash
uv pip install -e ".[dev]"
```

### 代码格式化

项目使用 black 和 isort 进行代码格式化：

```bash
black liveatc_backend
isort liveatc_backend
```

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。