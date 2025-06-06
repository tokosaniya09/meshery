import React, { useEffect, useState, useRef } from 'react';
import MUIDataTable from 'mui-datatables';
import Moment from 'react-moment';
import CustomToolbarSelect from '../CustomToolbarSelect';
import MesheryChart from '../MesheryChart';
import GrafanaCustomCharts from '../telemetry/grafana/GrafanaCustomCharts';
import GenericModal from '../GenericModal';
import BarChartIcon from '@mui/icons-material/BarChart';
import InfoIcon from '@mui/icons-material/Info';
import fetchPerformanceResults from '../graphql/queries/PerformanceResultQuery';
import NodeDetails from '../NodeDetails';
import ReplyIcon from '@mui/icons-material/Reply';
import FacebookIcon from './assets/facebookIcon';
import LinkedinIcon from './assets/linkedinIcon';
import TwitterIcon from './assets/twitterIcon';
import { iconMedium, iconLarge } from '../../css/icons.styles';
import { TwitterShareButton, LinkedinShareButton, FacebookShareButton } from 'react-share';
import subscribePerformanceProfiles from '../graphql/subscriptions/PerformanceResultSubscription';
import { useNotification } from '../../utils/hooks/useNotification';
import { EVENT_TYPES } from '../../lib/event-types';
import {
  Tab,
  Tabs,
  IconButton,
  Paper,
  Popper,
  ClickAwayListener,
  useTheme,
  NoSsr,
  Fade,
} from '@layer5/sistent';

import { DefaultTableCell, SortableTableCell } from '../connections/common';
import { useDispatch, useSelector } from 'react-redux';
import { updateProgress } from '@/store/slices/mesheryUi';
import { updateResultsSelection } from '@/store/slices/prefTest';

const COL_MAPPING = {
  QPS: 3,
  P99: 6,
};

function generateResultsForDisplay(results) {
  if (Array.isArray(results)) {
    return results.map((record) => {
      const data = {
        name: record.name,
        mesh: record.mesh,
        test_start_time: record.runner_results.StartTime,
        qps: record.runner_results.ActualQPS?.toFixed(1) || 'unavailable',
        duration: (record.runner_results.ActualDuration / 1000000000).toFixed(1),
        threads: record.runner_results.NumThreads,
      };

      if (record.runner_results?.DurationHistogram?.Percentiles) {
        record.runner_results.DurationHistogram.Percentiles.forEach(({ Percentile, Value }) => {
          data[`p${Percentile}`.replace('.', '_')] = Value.toFixed(3);
        });
      } else {
        data.p50 = 0;
        data.p75 = 0;
        data.p90 = 0;
        data.p99 = 0;
        data.p99_9 = 0;
      }

      return data;
    });
  }

  return [];
}

function generateColumnsForDisplay(
  sortOrder,
  setSelectedProfileIdxForChart,
  setSelectedProfileIdxForNodeDetails,
  theme,
  handleSocialExpandClick,
  handleClickAway,
  socialExpand,
  anchorEl,
  socialMessage,
) {
  const columns = [
    {
      name: 'name',
      label: 'Name',
      options: {
        filter: false,
        sort: true,
        searchable: true,
        customHeadRender: function CustomHead({ index, ...column }, sortColumn, columnMeta) {
          return (
            <SortableTableCell
              index={index}
              columnData={column}
              columnMeta={columnMeta}
              onSort={() => sortColumn(index)}
            />
          );
        },
      },
    },
    {
      name: 'mesh',
      label: 'Mesh',
      options: {
        filter: false,
        sort: true,
        searchable: true,
        customHeadRender: function CustomHead({ index, ...column }, sortColumn, columnMeta) {
          return (
            <SortableTableCell
              index={index}
              columnData={column}
              columnMeta={columnMeta}
              onSort={() => sortColumn(index)}
            />
          );
        },
      },
    },
    {
      name: 'test_start_time',
      label: 'Start Time',
      options: {
        filter: false,
        sort: true,
        searchable: true,
        customHeadRender: function CustomHead({ index, ...column }, sortColumn, columnMeta) {
          return (
            <SortableTableCell
              index={index}
              columnData={column}
              columnMeta={columnMeta}
              onSort={() => sortColumn(index)}
            />
          );
        },
        customBodyRender: function CustomBody(value) {
          return <Moment format="LLLL">{value}</Moment>;
        },
      },
    },
    {
      name: 'qps',
      label: 'QPS',
      options: {
        filter: false,
        sort: false,
        searchable: false,
        customHeadRender: function CustomHead({ ...column }) {
          return <DefaultTableCell columnData={column} />;
        },
      },
    },
    {
      name: 'duration',
      label: 'Duration',
      options: {
        filter: false,
        sort: false,
        searchable: false,
        customHeadRender: function CustomHead({ ...column }) {
          return <DefaultTableCell columnData={column} />;
        },
      },
    },

    {
      name: 'p50',
      label: 'P50',
      options: {
        filter: false,
        sort: false,
        searchable: false,
        customHeadRender: function CustomHead({ ...column }) {
          return <DefaultTableCell columnData={column} />;
        },
      },
    },

    {
      name: 'p99_9',
      label: 'P99.9',
      options: {
        filter: false,
        sort: false,
        searchable: false,
        customHeadRender: function CustomHead({ ...column }) {
          return <DefaultTableCell columnData={column} />;
        },
      },
    },
    {
      name: 'Chart',
      options: {
        filter: false,
        sort: false,
        searchable: false,
        customHeadRender: function CustomHead({ ...column }) {
          return <DefaultTableCell columnData={column} />;
        },
        customBodyRender: function CustomBody(value, tableMeta) {
          return (
            <IconButton
              aria-label="more"
              data-testid="open-performance-result-bar-chart"
              color="inherit"
              onClick={() => setSelectedProfileIdxForChart(tableMeta.rowIndex)}
            >
              <BarChartIcon style={iconMedium} /> {/* can change it to large */}
            </IconButton>
          );
        },
      },
    },
    {
      name: 'Node Details',
      options: {
        filter: false,
        sort: false,
        searchable: false,
        customHeadRender: function CustomHead({ ...column }) {
          return <DefaultTableCell columnData={column} />;
        },
        customBodyRender: function CustomBody(value, tableMeta) {
          return (
            <IconButton
              aria-label="more"
              color="inherit"
              onClick={() => setSelectedProfileIdxForNodeDetails(tableMeta.rowIndex)}
            >
              <InfoIcon style={iconMedium} /> {/* can change it to large */}
            </IconButton>
          );
        },
      },
    },
    {
      name: 'Share Results',
      options: {
        filter: false,
        sort: false,
        searchable: false,
        customHeadRender: function CustomHead({ ...column }) {
          return <DefaultTableCell columnData={column} />;
        },
        customBodyRender: function CustomBody(_, tableMeta) {
          return (
            <>
              <IconButton
                style={iconMedium}
                aria-label="Share"
                onClick={(e) => handleSocialExpandClick(e, tableMeta)}
              >
                <ReplyIcon
                  style={{
                    transform: 'scaleX(-1)',
                    color: theme.palette.icon.default,
                    ...iconLarge,
                  }}
                />
              </IconButton>
              <Popper
                open={socialExpand[tableMeta.rowIndex]}
                anchorEl={anchorEl[tableMeta.rowIndex]}
                transition
              >
                {({ TransitionProps }) => (
                  <ClickAwayListener onClickAway={() => handleClickAway(tableMeta.rowIndex)}>
                    <Fade {...TransitionProps} timeout={350}>
                      <Paper sx={{ padding: theme.spacing(1) }}>
                        <TwitterShareButton
                          style={{ margin: theme.spacing(0.4) }}
                          url={'https://meshery.io'}
                          title={socialMessage}
                          hashtags={['opensource']}
                        >
                          {/* <img src={`/static/img/twitter.svg`} /> */}
                          <TwitterIcon />
                        </TwitterShareButton>
                        <LinkedinShareButton
                          style={{ margin: theme.spacing(0.4) }}
                          url={'https://meshery.io'}
                          summary={socialMessage}
                        >
                          {/* <img src={`/static/img/linkedin.svg`} /> */}
                          <LinkedinIcon />
                        </LinkedinShareButton>
                        <FacebookShareButton
                          style={{ margin: theme.spacing(0.4) }}
                          url={'https://meshery.io'}
                          quote={socialMessage}
                          hashtag={'#opensource'}
                        >
                          {/* <img src={`/static/img/facebook.svg`} /> */}
                          <FacebookIcon />
                        </FacebookShareButton>
                      </Paper>
                    </Fade>
                  </ClickAwayListener>
                )}
              </Popper>
            </>
          );
        },
      },
    },
  ];

  return columns.map((column) => {
    if (column.name === sortOrder.split(' ')[0]) {
      column.options.sortDirection = sortOrder.split(' ')[1];
    }

    return column;
  });
}

function getSocialMessageForPerformanceTest(rps, percentile) {
  return `I achieved ${rps.trim()} RPS running my service at a P99.9 of ${percentile} ms using @mesheryio with @smp_spec! Find out how fast your service is with`;
}

function generateSelectedRows(results_selection, page, pageSize) {
  const rowsSelected = [];
  Object.keys(results_selection).forEach((pg) => {
    if (parseInt(pg) !== page) {
      Object.keys(results_selection[parseInt(pg)]).forEach((ind) => {
        const val = (parseInt(pg) + 1) * pageSize + parseInt(ind) + 1;
        rowsSelected.push(val);
      });
    } else {
      Object.keys(results_selection[page]).forEach((ind) => {
        const val = parseInt(ind);
        rowsSelected.push(val);
      });
    }
  });

  return rowsSelected;
}

function ResultChart({ result, handleTabChange, tabValue }) {
  if (!result) return <div />;

  // const getMuiTheme = () => createTheme({
  //   overrides : {
  //     MuiTab : {
  //       textColorInherit : {
  //         textTransform : "none",
  //         backgroundColor : "#eaeff1"
  //       }
  //     }
  //   }
  // })
  const row = result.runner_results;
  const boardConfig = result.server_board_config;
  const serverMetrics = result.server_metrics;
  const startTime = new Date(row.StartTime);
  const endTime = new Date(startTime.getTime() + row.ActualDuration / 1000000);

  return (
    <Paper
      style={{
        width: '100%',
        maxWidth: '90vw',
        padding: '0.5rem',
      }}
    >
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label="Performance Chart" />
        <Tab label="Node Details" />
      </Tabs>

      {tabValue == 0 ? (
        <div>
          <div>
            <MesheryChart
              rawdata={[result && result.runner_results ? result : {}]}
              data={[result && result.runner_results ? result.runner_results : {}]}
            />
          </div>
          {boardConfig && boardConfig !== null && Object.keys(boardConfig).length > 0 && (
            <div>
              <GrafanaCustomCharts
                boardPanelConfigs={[boardConfig]}
                // @ts-ignore
                boardPanelData={[serverMetrics]}
                startDate={startTime}
                from={startTime.getTime().toString()}
                endDate={endTime}
                to={endTime.getTime().toString()}
                liveTail={false}
              />
            </div>
          )}
        </div>
      ) : tabValue == 1 ? (
        <div>
          <NodeDetails result={row} />
        </div>
      ) : (
        <div />
      )}
    </Paper>
  );
}

function ResultNodeDetails({ result, handleTabChange, tabValue }) {
  if (!result) return <div />;
  const chartData = result.runner_results;

  const row = result.runner_results;
  const boardConfig = result.server_board_config;
  const serverMetrics = result.server_metrics;
  const startTime = new Date(row.StartTime);
  const endTime = new Date(startTime.getTime() + row.ActualDuration / 1000000);
  return (
    <Paper
      style={{
        width: '100%',
        maxWidth: '90vw',
        padding: '0.5rem',
      }}
    >
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        TabIndicatorProps={{
          style: {
            backgroundColor: '#00B39F',
          },
        }}
      >
        <Tab label="Performance Chart" />
        <Tab label="Node Details" />
      </Tabs>
      {tabValue == 1 ? (
        <div>
          <NodeDetails result={chartData} />
        </div>
      ) : tabValue == 0 ? (
        <div>
          <div>
            <MesheryChart
              rawdata={[result && result.runner_results ? result : {}]}
              data={[result && result.runner_results ? result.runner_results : {}]}
            />
          </div>
          {boardConfig && boardConfig !== null && Object.keys(boardConfig).length > 0 && (
            <div>
              <GrafanaCustomCharts
                boardPanelConfigs={[boardConfig]}
                // @ts-ignore
                boardPanelData={[serverMetrics]}
                startDate={startTime}
                from={startTime.getTime().toString()}
                endDate={endTime}
                to={endTime.getTime().toString()}
                liveTail={false}
              />
            </div>
          )}
        </div>
      ) : (
        <div />
      )}
    </Paper>
  );
}

/**
 *
 * @param {{
 *  updateProgress?: any,
 *  results_selection?: any,
 *  user?: any
 *  updateResultsSelection?: any,
 *  endpoint: string,
 *  CustomHeader?: JSX.Element
 *  elevation?: Number
 * }} props
 */
function MesheryResults({ endpoint, CustomHeader = <div />, elevation = 4 }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [results, setResults] = useState([]);
  const [selectedRowChart, setSelectedRowChart] = useState();
  const [selectedRowNodeDetails, setSelectedRowNodeDetails] = useState();
  const [tabValue, setTabValue] = useState(0);
  const [socialExpand, setSocialExpand] = useState([false]);
  const [anchorEl, setAnchorEl] = useState([]);
  const [socialMessage, setSocialMessage] = useState();
  const theme = useTheme();
  const { user } = useSelector((state) => state.ui);
  const dispatch = useDispatch();
  const { results_selection } = useSelector((state) => state.prefTest);
  const searchTimeout = useRef();
  const { notify } = useNotification();

  useEffect(() => {
    fetchResults(page, pageSize, search, sortOrder);

    //TODO: remove this
    const subscription = subscribePerformanceProfiles(
      (res) => {
        // @ts-ignore
        let result = res?.subscribePerfResults;
        if (typeof result !== 'undefined') {
          updateProgress({ showProgress: false });

          if (result) {
            setCount(result.total_count);
            setPageSize(result.page_size);
            setSortOrder(sortOrder);
            setSearch(search);
            setResults(result.results);
            setPageSize(result.page_size);
          }
        }
      },
      {
        selector: {
          pageSize: `${pageSize}`,
          page: `${page}`,
          search: `${encodeURIComponent(search)}`,
          order: `${encodeURIComponent(sortOrder)}`,
        },
        profileID: endpoint.split('/')[endpoint.split('/').length - 2],
      },
    );
    return () => {
      subscription.dispose();
    };
  }, [page, pageSize, search, sortOrder]);

  const handleSocialExpandClick = (e, tableMeta) => {
    let socialExpandUpdate = [...socialExpand];
    socialExpandUpdate[tableMeta.rowIndex] = !socialExpand[tableMeta.rowIndex];
    setSocialExpand(socialExpandUpdate);

    let anchorElUpdate = [...anchorEl];
    anchorElUpdate[tableMeta.rowIndex] = e.currentTarget;
    setAnchorEl(anchorElUpdate);
    setSocialMessage(
      getSocialMessageForPerformanceTest(
        tableMeta.rowData[COL_MAPPING.QPS],
        tableMeta.rowData[COL_MAPPING.P99],
      ),
    );
  };

  const handleClickAway = (index) => {
    let socialExpandUpdate = [...socialExpand];
    socialExpandUpdate[index] = !socialExpand[index];
    setSocialExpand(socialExpandUpdate);
  };

  function fetchResults(page, pageSize, search, sortOrder) {
    if (!search) search = '';
    if (!sortOrder) sortOrder = '';

    updateProgress({ showProgress: true });

    fetchPerformanceResults({
      selector: {
        pageSize: `${pageSize}`,
        page: `${page}`,
        search: `${encodeURIComponent(search)}`,
        order: `${encodeURIComponent(sortOrder)}`,
      },
      profileID: endpoint.split('/')[endpoint.split('/').length - 2],
    }).subscribe({
      next: (res) => {
        // @ts-ignore
        let result = res?.fetchResults;
        if (typeof result !== 'undefined') {
          updateProgress({ showProgress: false });

          if (result) {
            setCount(result.total_count);
            setPageSize(result.page_size);
            setSortOrder(sortOrder);
            setSearch(search);
            setResults(result.results);
            setPageSize(result.page_size);
          }
        }
      },
      error: handleError,
    });
  }

  function handleError(error) {
    updateProgress({ showProgress: false });
    notify({
      message: `There was an error fetching results: ${error}`,
      event_type: EVENT_TYPES.ERROR,
      details: error.toString(),
    });
  }

  const columns = generateColumnsForDisplay(
    sortOrder,
    (idx) => {
      setSelectedRowChart(results[idx]);
      setTabValue(0);
    },
    (idx) => {
      setSelectedRowNodeDetails(results[idx]);
      setTabValue(1);
    },
    theme,
    handleSocialExpandClick,
    handleClickAway,
    socialExpand,
    anchorEl,
    socialMessage,
  );

  const options = {
    elevation: elevation,
    filter: false,
    sort: !(user?.user_id === 'meshery'),
    search: !(user?.user_id === 'meshery'),
    filterType: 'textField',
    responsive: 'standard',
    resizableColumns: true,
    selectableRows: 'multiple',
    serverSide: true,
    count,
    rowsPerPage: pageSize,
    rowsPerPageOptions: [10, 20, 25],
    fixedHeader: true,
    page,
    rowsSelected: generateSelectedRows(results_selection, page, pageSize),
    print: false,
    download: false,
    onRowsSelect: (_, allRowsSelected) => {
      // const rs = self.props.results_selection;
      const res = {};
      allRowsSelected.forEach(({ dataIndex }) => {
        if (dataIndex < pageSize) {
          if (res[dataIndex]) delete res[dataIndex];
          else res[dataIndex] = results[dataIndex];
        }
      });

      dispatch(updateResultsSelection({ page, results: res }));
    },

    onTableChange: (action, tableState) => {
      const sortInfo = tableState.announceText ? tableState.announceText.split(' : ') : [];
      let order = '';
      if (tableState.activeColumn) {
        order = `${columns[tableState.activeColumn].name} desc`;
      }

      switch (action) {
        case 'changePage':
          setPage(tableState.page);
          break;
        case 'changeRowsPerPage':
          setPageSize(tableState.rowsPerPage);
          break;
        case 'search':
          if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
          }
          // @ts-ignore
          searchTimeout.current = setTimeout(() => {
            if (search !== tableState.searchText) {
              setSearch(tableState.searchText || '');
            }
          }, 500);
          break;
        case 'sort':
          if (sortInfo.length === 2) {
            if (sortInfo[1] === 'ascending') order = `${columns[tableState.activeColumn].name} asc`;
            else order = `${columns[tableState.activeColumn].name} desc`;
          }

          if (order !== sortOrder) setSortOrder(order);
          break;
      }
    },
    customToolbarSelect: function CustomToolbarSelectComponent(
      selectedRows,
      displayData,
      setSelectedRows,
    ) {
      return (
        <CustomToolbarSelect
          selectedRows={selectedRows}
          displayData={displayData}
          setSelectedRows={setSelectedRows}
          results={results}
        />
      );
    },
  };

  function handleTabChange(event, newValue) {
    setTabValue(newValue);
  }

  return (
    <NoSsr>
      <MUIDataTable
        title={CustomHeader}
        data={generateResultsForDisplay(results)}
        columns={columns}
        // @ts-ignore
        options={options}
      />

      <GenericModal
        open={!!selectedRowChart}
        // @ts-ignore
        Content={
          <ResultChart
            result={selectedRowChart}
            handleTabChange={handleTabChange}
            tabValue={tabValue}
          />
        }
        handleClose={() => setSelectedRowChart(undefined)}
      />

      <GenericModal
        open={!!selectedRowNodeDetails}
        // @ts-ignore
        Content={
          <ResultNodeDetails
            result={selectedRowNodeDetails}
            handleTabChange={handleTabChange}
            tabValue={tabValue}
          />
        }
        handleClose={() => setSelectedRowNodeDetails(undefined)}
      />
    </NoSsr>
  );
}
export default MesheryResults;
