# from pymongo  import MongoClient
# import datetime

#    # MongoDB connection string
# MONGO_URI = 'mongodb://localhost:27017/VYU'

#    # Connect to MongoDB
# client = MongoClient(MONGO_URI)
# db = client['VYU']
# collection = db['peoples']

#    # Example time series data
# timeseries_data = [
#        {
#            "name": "John Doe",
#            "age": 30,
#            "createdAt": datetime.datetime.now()
#        },
#        {
#            "name": "Jane Doe",
#            "age": 25,
#            "createdAt": datetime.datetime.now() - datetime.timedelta(days=1)
#        },
#    ]

#    # Insert data into MongoDB
# collection.insert_many(timeseries_data)
# print("Data inserted!")

#    # Close the connection
# client.close()
