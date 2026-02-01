#!/bin/bash

# Prophet Trader 实时监控脚本
# 每隔一段时间自动刷新持仓和盈亏情况

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Prophet Trader 实时监控${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

while true; do
    # 获取当前时间
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${YELLOW}更新时间: $TIMESTAMP${NC}"
    echo ""
    
    # 获取账户信息
    echo -e "${BLUE}账户总览:${NC}"
    ACCOUNT=$(curl -s http://localhost:4534/api/v1/account)
    
    CASH=$(echo $ACCOUNT | grep -o '"Cash":[0-9.]*' | cut -d: -f2)
    BUYING_POWER=$(echo $ACCOUNT | grep -o '"BuyingPower":[0-9.]*' | cut -d: -f2)
    PORTFOLIO_VALUE=$(echo $ACCOUNT | grep -o '"PortfolioValue":[0-9.]*' | cut -d: -f2)
    
    echo "  现金: \$$CASH"
    echo "  购买力: \$$BUYING_POWER"
    echo "  总资产: \$$PORTFOLIO_VALUE"
    echo ""
    
    # 获取持仓信息
    echo -e "${BLUE}当前持仓:${NC}"
    POSITIONS=$(curl -s http://localhost:4534/api/v1/options/positions)
    
    # 解析并显示每个持仓
    echo "$POSITIONS" | python3 -c "
import sys, json
try:
    positions = json.load(sys.stdin)
    if not positions:
        print('  ${YELLOW}暂无持仓${NC}')
    else:
        total_value = 0
        total_pnl = 0
        for p in positions:
            symbol = p['Symbol']
            qty = p['Qty']
            current = p['CurrentPrice']
            cost = p['AvgEntryPrice']
            pnl = p['UnrealizedPL']
            pnl_pct = p['UnrealizedPLPC'] * 100
            
            total_value += p['MarketValue']
            total_pnl += pnl
            
            # 根据盈亏显示颜色
            if pnl >= 0:
                color = '${GREEN}'
            else:
                color = '${RED}'
            
            print(f'  {symbol}')
            print(f'    数量: {qty} 张')
            print(f'    成本: \${cost:.2f} | 当前: \${current:.2f}')
            print(f'    {color}盈亏: \${pnl:.2f} ({pnl_pct:.2f}%)${NC}')
            print()
        
        print(f'${BLUE}总计:${NC}')
        print(f'  持仓市值: \${total_value:.2f}')
        if total_pnl >= 0:
            print(f'  ${GREEN}总盈亏: \${total_pnl:.2f}${NC}')
        else:
            print(f'  ${RED}总盈亏: \${total_pnl:.2f}${NC}')
except:
    print('  ${RED}无法解析持仓数据${NC}')
"
    
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止监控${NC}"
    echo "-------------------------------------------"
    echo ""
    
    # 等待30秒后刷新
    sleep 30
    clear
done
