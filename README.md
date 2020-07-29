# MOSEC-NODE-PLUGIN

用于检测 node 项目的第三方依赖组件是否存在安全漏洞。

该项目是基于 [snyk/resolve-deps](https://github.com/snyk/resolve-deps.git) 的二次开发。

## 版本支持

npm >= 5.2.0

## 使用

首先运行 [MOSEC-X-PLUGIN Backend](https://github.com/momosecurity/mosec-x-plugin-backend.git)

#### 无需安装即可使用
```
> cd your_node_project/
> npx github:momosecurity/mosec-node-plugin \
  --endpoint https://127.0.0.1:9000/api/plugin \ 
  --only-provenance
```
