import json
import pandas
import os

base_dir = os.path.abspath(os.path.dirname(__name__))
data_dir = os.path.join(base_dir, "arbitrageHistoryKovan.json")

if __name__ == "__main__":
    with open(data_dir) as file:
        histData = json.load(file)
        df_histData = pandas.DataFrame(histData)
        df_histData.to_excel(os.path.join(base_dir, "utils/outputData/performanceSummery.xlsx"))
