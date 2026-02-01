#!/bin/bash

# 紧急停止自动交易脚本
# 当你想停止自动交易时运行此脚本

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}  停止自动交易系统${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# 查找并停止 Claude 进程
echo -e "${YELLOW}正在查找自动交易进程...${NC}"
CLAUDE_PID=$(ps aux | grep -i "claude.*autonomous" | grep -v grep | awk '{print $2}')

if [ -n "$CLAUDE_PID" ]; then
    echo -e "${YELLOW}找到 Claude 进程 (PID: $CLAUDE_PID)${NC}"
    kill $CLAUDE_PID
    echo -e "${GREEN}✓ 已停止 Claude 自动交易${NC}"
else
    echo -e "${YELLOW}未找到运行中的 Claude 自动交易进程${NC}"
fi

echo ""

# 查看当前持仓
echo -e "${YELLOW}当前持仓情况:${NC}"
curl -s http://localhost:4534/api/v1/options/positions | python3 -c "
import sys, json
try:
    positions = json.load(sys.stdin)
    if not positions:
        print('  暂无持仓')
    else:
        for p in positions:
            print(f\"  {p['Symbol']}: {p['Qty']} 张, 盈亏: \${p['UnrealizedPL']:.2f}\")
except:
    print('  无法获取持仓信息')
"

echo ""
echo -e "${YELLOW}注意:${NC}"
echo "  • 自动交易已停止，但持仓仍然存在"
echo "  • Go 后端仍在运行，托管止损/止盈仍然生效"
echo "  • 如需手动平仓，请使用 MCP 工具或 API"
echo ""
echo -e "${GREEN}系统状态:${NC}"
echo "  • Go 后端: $(lsof -Pi :4534 -sTCP:LISTEN -t >/dev/null 2>&1 && echo '运行中' || echo '已停止')"
echo ""
