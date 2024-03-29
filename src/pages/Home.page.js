import React, { useContext } from 'react';
import request, { gql } from 'graphql-request';
import PageContainer from "../components/PageContainer.component";
import { UserContext } from '../contexts/user.context';
import { GRAPHQL_ENDPOINT } from '../realm/constants';
import { useQuery } from 'react-query';
import Table from '../components/ReactTable.component'
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, TextField } from "@mui/material";

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();

    function redirect(loc) {
        const redirectTo = location.search.replace("?redirectTo=", "");
        navigate(redirectTo ? redirectTo : "/" + loc);
      }

  const { user } = useContext(UserContext);
  const { logOutUser } = useContext(UserContext);

  const getDataQuery = gql`
  {
    landholdings {
      LegalEntity
      MineralOwnerRoyalty
      Name
      NetMineralAcres
      Owner
      Range
      Section
      SectionName
      TitleSource
      Township
      _id
    }
    
      owners {
      OwnerName
      EntityType
      OwnerType
      Address
      TotalNumberOfLandHoldings
      _id
    }
  }
  `;

  const queryVariables = {};

  const headers = { Authorization: `Bearer ${user._accessToken}` }

  const loadData = () => request(GRAPHQL_ENDPOINT,
    getDataQuery,
    queryVariables,
    headers
  );

  async function removeOwner(id, owner) {
    var response = window.confirm("Are you sure you wish to remove this Owner?\nThis also removes any related Holdings.")
    if (!response) return 

    await request(GRAPHQL_ENDPOINT,
        `
            mutation DeleteOneOwner($id: ObjectId) {
                deleteOneOwner(query: {_id: $id}) {
                    _id
                }
            }
        `,
        {"id" : id},
        headers
        )
    console.log(id + " Deleted");

    await request(GRAPHQL_ENDPOINT,
        `
            mutation DeleteManyHoldings($owner: String) {
                deleteManyLandholdings(query: {Owner: $owner}) {
                    deletedCount
                }
            }
        `,
        {"owner" : owner},
        headers
        )
    console.log("Holdings Deleted");
    afterDelete();
  }

  async function removeHolding(id, owner) {
    var response = window.confirm("Are you sure you wish to remove this Holding?")
    if (!response) return 

    await request(GRAPHQL_ENDPOINT,
        `
        mutation DeleteOneHolding($id: ObjectId) {
            deleteOneLandholding(query: {_id: $id}) {
                _id
            }
        }
        `,
        {"id" : id},
        headers
        );
    
    await request(GRAPHQL_ENDPOINT,
        `
        mutation UpdateOneOwner($owner: String) {
            updateOneOwner(query: {OwnerName: $owner}, set: {TotalNumberOfLandHoldings_inc: -1}) {
                _id
                }
        }
        `,
        {"owner": owner},
        headers
        );

    afterDelete();
  }

  const ownerColumns = React.useMemo( () => [ {

    Header: "Info",
    accessor: "info",
    columns: [
        {
            Header: "Owner Name",
            accessor: "OwnerName"
        },
        {
            Header: "Entity Type",
            accessor: "EntityType"
        },
        {
            Header: "Owner Type",
            accessor: "OwnerType"
        },
        {
            Header: "Address",
            accessor: "Address"
        },
        {
            Header: "Total Land Holdings",
            accessor: "TotalNumberOfLandHoldings"
        },
    ],
    },
    {
        Header: "Actions",
        accessor: "actions",
        columns: [
            {
                accessor: "edit",
                Cell: ({row}) => (
                    <span
                    style = {{
                        cursor: "pointer",
                        color: "blue",
                        textDecoration: "underline",
                    }}
                    onClick={() => {
                        redirect(`editowner/${row.original._id}`)
                    }}
                    >
                        Edit
                    </span>
                )
            },
            {
                accessor: "delete",
                Cell: ({row}) => (
                    <span
                    style = {{
                        cursor: "pointer",
                        color: "blue",
                        textDecoration: "underline",
                    }}
                    onClick={() => {
                        removeOwner(row.original._id, row.original.OwnerName)
                    }}
                    >
                        Delete
                    </span>
                )
            },

        ]

    },
    ],
  );

    const holdingColumns = [
        {
            Header: "Info",
            accessor: "info",
            columns: [
                {
                    Header: "Name",
                    accessor: "Name"
                },
                {
                    Header: "Owner",
                    accessor: "Owner"
                },
                {
                    Header: "Legal Entity",
                    accessor: "LegalEntity"
                },
                {
                    Header: "Net Mineral Acres",
                    accessor: "NetMineralAcres"
                },
                {
                    Header: "Mineral Owner Royalty (%)",
                    accessor: "MineralOwnerRoyalty"
                },
                {
                    Header: "Section Name",
                    accessor: "SectionName"
                },
                {
                    Header: "Section",
                    accessor: "Section"
                },
                {
                    Header: "Township",
                    accessor: "Township"
                },
                {
                    Header: "Range",
                    accessor: "Range"
                },
                {
                    Header: "Title Source",
                    accessor: "TitleSource"
                },
            ]
        },

        
        {
            Header: "Actions",
            accessor: "actions",
            columns: [
                {
                    accessor: "edit",
                    Cell: ({row}) => (
                        <span
                        style = {{
                            cursor: "pointer",
                            color: "blue",
                            textDecoration: "underline",
                        }}
                        onClick={() => {
                            redirect(`editholding/${row.original._id}`)
                        }}
                        >
                            Edit
                        </span>
                    )
                },
                {
                    accessor: "delete",
                    Cell: ({row}) => (
                        <span
                        style = {{
                            cursor: "pointer",
                            color: "blue",
                            textDecoration: "underline",
                        }}
                        onClick={() => {
                            removeHolding(row.original._id, row.original.Owner)
                        }}
                        >
                            Delete
                        </span>
                    )
                },

            ]

        },
        ];

  // useQuery to recieve data
  // Also, we don't need to manage state separately. The data
  // is already managed by the useQuery hook
  const { isLoading, error, data, refetch } = useQuery("allData", loadData);
        
  // To be performed whenever something gets deleted.
  // Here, instead of calling the loadExpenses function, we are calling
  // the refetch function. This will trigger the loadExpenses function
  // on our behalf, and will update the state automatically.
  const afterDelete = () => {
    refetch();
  };

  if (isLoading) return "Loading";

  if (error) return error.message;

  return <PageContainer>
    <h1 style={{paddingTop: '25px'}}>Database</h1>

    <div>
        <h2 style={{margin: '15px'}}>Owners</h2>
        <Table
            data = {data.owners}
            columns = {ownerColumns}
        >
        </Table>
        <Button style={{margin: '15px'}} variant="contained" onClick={() => redirect("newowner")}>
            Create New Owner
        </Button>
        <h2 style={{margin: '15px'}}>Land Holdings</h2>
        <Table
            data = {data.landholdings}
            columns = {holdingColumns}
        >
            
        </Table>
        <Button style={{margin: '15px'}} variant="contained" onClick={() => redirect("newholding")}>
        Create New Land Holding
        </Button>
        <br></br>
        <br></br>
        <br></br>
        <Button variant="contained" onClick={logOutUser}>
        Logout
        </Button>
    </div>
    

  </PageContainer>
}

export default Home;