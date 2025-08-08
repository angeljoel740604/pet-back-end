import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Window } from '@progress/kendo-react-dialogs';


const Index = () => {
  // const [data, setData] = React.useState({});
  const [data] = React.useState([
    {
        "HTS": "0102294028",
        "Description": "Part Description 2",
        "PartNumber": "PART 2",
        "Qty": 36,
        "Weight": 2016,
        "Price": 144,
        "InvoiceNumber": ""
    },
    {
        "HTS": "",
        "Description": "Part Description 2",
        "PartNumber": "PART 2",
        "Qty": 12,
        "Weight": 672,
        "Price": 48,
        "InvoiceNumber": ""
    },
    {
        "HTS": "0106410000",
        "Description": "Part Description 2",
        "PartNumber": "PART 2",
        "Qty": 12,
        "Weight": 672,
        "Price": 48,
        "InvoiceNumber": ""
    }
]);

  //Data Api
  // React.useEffect(() => {
  //   const fetchData = async () => {
  //     const resp = await axios.get("/shipment");
  //     const items = resp.data.map((item) => {
  //       return {
  //         HTS: item.HTS,
  //         Description: item.Description,
  //         PartNumber: item.PartNumber,
  //         Qty: item.Pieces,
  //         Weight: item.Weight,
  //         Price: item.TotalValue,
  //         InvoiceNumber: item.InvoiceNumber,
  //       };
  //     });
  //     setData(items);
  //   };
  //   fetchData();
  // }, []);

  // style={{ height: "580px" }}
  return (
    <React.Fragment>
      <Grid data={data}  style={{ height: "400px", width: "1450px",textAlign:"left" }}>
      <GridColumn
          field=""
          cell={(props) => (
            <td>
              <input type="checkbox" checked={props.dataItem[props.field]} />
            </td>
          )}
        />
        <GridColumn field="HTS" title="HTS" width="100px"   />
        <GridColumn field="Description" title="Description" width="200px" />
        <GridColumn field="PartNumber" title="PartNumber"  width="100px"  />
        <GridColumn field="Qty" title="Qty" width="50px" style={{textAlign: "left"}}/>
        <GridColumn field="Weight" title="Weight" width="70px"/>
        <GridColumn field="Price" title="Price" width="70px"/>
        <GridColumn field="InvoiceNumber" title="InvoiceNumber" width="120px"/>
      </Grid>
      <div>
        <p>Hello Next.js, this is your friend Brian from logrocket</p>
      </div>
    </React.Fragment>
  );
};
export default Index;
