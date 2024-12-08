import axios from 'axios';

export const pollKpisAndSendUpdates = async (io: any, kpiRegistry: any) => {
  const pollingIntervals: Record<string, NodeJS.Timeout> = {};

  io.on('connection', (socket: any) => {
    console.log('Frontend connected:', socket.id);

    socket.on('startPolling', () => {
      Object.keys(kpiRegistry).forEach((kpi_name) => {
        if (!pollingIntervals[kpi_name]) {
          pollingIntervals[kpi_name] = setInterval(async () => {
            const { apiUrl, requestParams } = kpiRegistry[kpi_name];
            try {
              // Using GET method as per your initial approach
              const response = await axios.get(apiUrl, { params: requestParams });
              
              // Emit new data for the specific KPI card
              socket.emit('kpiUpdate', { kpi_title: kpi_name, newData: response.data });
              console.log(`Updated data sent for KPI: ${kpi_name}`);
            } catch (error) {
              // Properly type the error object
              if (axios.isAxiosError(error)) {
                // Handle Axios-specific errors
                console.error(`Axios error polling API for ${kpi_name}:`, error.message);
              } else if (error instanceof Error) {
                // Handle generic errors
                console.error(`Error polling API for ${kpi_name}:`, error.message);
              } else {
                // Handle unexpected error types
                console.error(`Unexpected error polling API for ${kpi_name}:`, error);
              }
            }
          }, 5000); // Poll every 5 seconds
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('Frontend disconnected:', socket.id);

      Object.keys(pollingIntervals).forEach((kpi_name) => {
        clearInterval(pollingIntervals[kpi_name]);
        delete pollingIntervals[kpi_name];
      });
    });
  });
};