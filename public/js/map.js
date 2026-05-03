/* ===== INTERACTIVE MAP & STATE DATA ===== */
export let STATE_ELECTION_DATA = {};

/**
 * Fetches state-wise election data from the backend API.
 * @async
 */
export async function fetchStateElectionData() {
  try {
    // Use relative URL — works because Express serves static files on the same port
    const response = await fetch('/api/election-data');
    if (response.ok) {
      STATE_ELECTION_DATA = await response.json();
    }
  } catch (err) {
    console.error('Failed to load state election data from backend', err);
  }
}

/**
 * Initializes the Google GeoChart for India.
 * Loads the visualization package and sets the draw callback.
 */
export function initInteractiveMap() {
  if (typeof google === 'undefined' || typeof google.charts === 'undefined') {
    // If google script hasn't loaded yet, retry in 100ms
    setTimeout(initInteractiveMap, 100);
    return;
  }

  google.charts.load('current', {
    packages: ['geochart'],
  });
  google.charts.setOnLoadCallback(drawRegionsMap);

  /**
   * Internal function to draw the regions map using Google Visualization API.
   */
  function drawRegionsMap() {
    const mapData = [['State', 'Status']];

    // Default list of all Indian states/UTs to ensure full coverage
    const allStates = [
      'Andaman and Nicobar Islands',
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Bihar',
      'Chandigarh',
      'Chhattisgarh',
      'Dadra and Nagar Haveli',
      'Daman and Diu',
      'Delhi',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jammu and Kashmir',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Ladakh',
      'Lakshadweep',
      'Madhya Pradesh',
      'Maharashtra',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Odisha',
      'Puducherry',
      'Punjab',
      'Rajasthan',
      'Sikkim',
      'Tamil Nadu',
      'Telangana',
      'Tripura',
      'Uttar Pradesh',
      'Uttarakhand',
      'West Bengal',
    ];

    allStates.forEach((state) => {
      const data = STATE_ELECTION_DATA[state];
      const status = data && data.current && data.current.active ? 1 : 0;

      // Push both friendly name and ISO code for maximum compatibility
      if (state === 'Odisha') {
        mapData.push(['IN-OR', status]);
        mapData.push(['Odisha', status]);
      } else if (state === 'Telangana') {
        mapData.push(['IN-TG', status]);
        mapData.push(['Telangana', status]);
      } else if (state === 'Uttarakhand') {
        mapData.push(['IN-UT', status]);
        mapData.push(['Uttarakhand', status]);
      } else {
        mapData.push([state, status]);
      }
    });

    const data = google.visualization.arrayToDataTable(mapData);

    const options = {
      region: 'IN',
      resolution: 'provinces',
      backgroundColor: 'transparent',
      datalessRegionColor: '#1a1f2e',
      defaultColor: '#138808',
      colorAxis: { colors: ['#2a324a', '#FF9933'] },
      tooltip: { textStyle: { color: '#ffffff' }, showColorCode: false },
      keepAspectRatio: true,
    };

    const chart = new google.visualization.GeoChart(document.getElementById('regions_div'));

    // Add event listener for click
    google.visualization.events.addListener(chart, 'select', function () {
      const selection = chart.getSelection();
      if (selection.length > 0) {
        const stateName = data.getValue(selection[0].row, 0);
        updateStatePanel(stateName);
      }
    });

    chart.draw(data, options);

    // Populate accessible state select dropdown for full keyboard fallback
    const selectEl = document.getElementById('map_state_select');
    if (selectEl && selectEl.options.length <= 1) {
      allStates.sort().forEach((state) => {
        const opt = document.createElement('option');
        opt.value = state;
        opt.textContent = state;
        selectEl.appendChild(opt);
      });

      selectEl.addEventListener('change', (e) => {
        if (e.target.value) {
          updateStatePanel(e.target.value);
        }
      });
    }

    // Make responsive with debounce to avoid excess redraws
    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => chart.draw(data, options), 150);
    });
  }
}

/**
 * Updates the side panel with details for the selected state.
 * @param {string} stateName - The name of the selected state.
 */
function updateStatePanel(stateName) {
  // Handle ISO codes if they come from the map selection
  let friendlyName = stateName;
  if (stateName === 'IN-OR') friendlyName = 'Odisha';
  if (stateName === 'IN-TG') friendlyName = 'Telangana';
  if (stateName === 'IN-UT') friendlyName = 'Uttarakhand';

  document.getElementById('panel_empty_state').style.display = 'none';
  document.getElementById('panel_state_name').textContent = friendlyName;

  const stateData = STATE_ELECTION_DATA[friendlyName];
  const currentDiv = document.getElementById('panel_current_elections');
  const currentContent = document.getElementById('panel_current_content');
  const prevDiv = document.getElementById('panel_previous_elections');
  const prevContent = document.getElementById('panel_previous_content');

  if (!stateData) {
    currentDiv.style.display = 'none';
    prevDiv.style.display = 'block';
    prevContent.innerHTML = `<strong>Data Unavailable</strong><br/>Historical election data for ${stateName} is currently being updated in our system.`;
    return;
  }

  // Current Elections
  if (stateData.current && stateData.current.active) {
    currentDiv.style.display = 'block';
    currentContent.innerHTML = `
      <strong>${stateData.current.title}</strong><br/>
      <span style="color: #ff6b6b; font-weight:600;">Status:</span> ${stateData.current.phase}<br/>
      <span style="color: #4ade80; font-weight:600;">Next:</span> ${stateData.current.next_date}
    `;
  } else {
    currentDiv.style.display = 'none';
  }

  // Previous Elections
  if (stateData.previous) {
    prevDiv.style.display = 'block';
    prevContent.innerHTML = `
      <strong>${stateData.previous.year}</strong><br/>
      <span style="color: #a0a8c0;">Ruling Party/Alliance:</span> <strong>${stateData.previous.ruling}</strong><br/>
      <span style="color: #a0a8c0;">Seats Won:</span> ${stateData.previous.seats}<br/>
      <span style="color: #a0a8c0;">Voter Turnout:</span> ${stateData.previous.turnout}
    `;
  } else {
    prevDiv.style.display = 'none';
  }
}
