import json
import pandas
import os
import sys

base_dir = os.path.abspath(os.path.dirname(__name__))
dotenv_dir = os.path.join(base_dir, ".env")

with open(dotenv_dir, 'r') as f:
    content = f.readlines()
content = [x.strip().split('=') for x in content if '=' in x]
envObj = dict(content)


if envObj["TESTNET"] == "yes":
    arbiSrcData_dir = os.path.join(base_dir, "arbitrageHistoryKovan.json")
    arbiOutData_dir = os.path.join(base_dir, "utils/outputData/performanceSummeryKovan.xlsx")
    moniSrcData_dir = os.path.join(base_dir, "utils/srcData/detailTrackingKovan.json")
    moniOutData_dir = os.path.join(base_dir, "utils/outputData/deailTrackingKovan.xlsx")
elif envObj["TESTNET"] == "no":
    arbiSrcData_dir = os.path.join(base_dir, "arbitrageHistory.json")
    arbiOutData_dir = os.path.join(base_dir, "utils/outputData/performanceSummery.xlsx")
    moniSrcData_dir = os.path.join(base_dir, "utils/srcData/detailTracking.json")
    moniOutData_dir = os.path.join(base_dir, "utils/outputData/deailTracking.xlsx")

if __name__ == "__main__":
    with open(arbiSrcData_dir) as file:
        histArbiData = json.load(file)
        df_histArbiData = pandas.DataFrame(histArbiData)
        df_histArbiData.to_excel(arbiOutData_dir)

    with open(moniSrcData_dir) as file:
        detailData = json.load(file)
        df_detailData = pandas.DataFrame(detailData)
        if df_detailData["isProfitable"].size > 20000:
            df_detailData = df_detailData[:][-20000:]
        df_detailData.to_excel(moniOutData_dir)
    

