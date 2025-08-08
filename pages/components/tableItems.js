import React, { useEffect, useState } from "react";

import * as ReactDOM from 'react-dom';
import { Grid, GridColumn as Column } from '@progress/kendo-react-grid';

const App = (props) => {
    const [data, setData] = useState({});
    const [columns, setColumns] = useState([]);
  
  
      //Data Api
        useEffect(() => {
            const fetchData = async () => {
              const resp = await axios.get('/shipment');
              const items = resp.data.map(item => {
                return {

                    HTS:item.HTS,
                    Description: item.Description,
                    PartNumber: item.PartNumber,
                    Qty: item.Pieces,
                    Weight: item.Weight,
                    Price: item.TotalValue,
                    InvoiceNumber: item.InvoiceNumber,
                }
              });
              setData(items);
            };
            fetchData();
          }, []);
  
      return (  
          <React.Fragment>
              <Grid
                style={{ height: '400px' }}
                data={[ ...data ]}
            >
                <Column field="HTS" title="HTS" width="40px" />
                <Column field="Description" title="Description" width="250px" />
                <Column field="PartNumber" title="PartNumber" />
                <Column field="Qty" title="Qty" />
                <Column field="Weight" title="Weight" />
                <Column field="Price" title="Price" />
                <Column field="InvoiceNumber" title="InvoiceNumber" />
                <Column
                    field="Discontinued"
                    cell={props => (
                        <td>
                            <input disabled type="checkbox" checked={props.dataItem[props.field]} />
                        </td>
                    )}
                />
            </Grid>
          </React.Fragment>
      );
  }
   
  export default App;