import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import OSM from 'ol/source/OSM';
import { useGeographic } from 'ol/proj';
import { fromLonLat } from 'ol/proj';
import LayerSwitcher from 'ol-ext/control/LayerSwitcher';
import Overview from 'ol-ext/control/Overview'
import SearchFeature from 'ol-ext/control/SearchFeature'
import ScaleLine from 'ol/control/ScaleLine'
import Overlay from 'ol/Overlay';
import data from './lithology.json'


import 'ol-ext/dist/ol-ext.css';

// console.log(data.data.length)
// console.log(data.data[0].Code)

const items = data.data
const legendContainer = document.getElementById('legend-container')
items.forEach((item) => {
  const legendItem = document.createElement('div')
  legendItem.classList.add('legend-item')

  const colorBox = document.createElement('div')
  colorBox.classList.add('color-box')
  colorBox.style.backgroundColor = item.Color;

  const label = document.createElement('span')
  label.textContent = `${item.Facies} (${item.Code})`;

  legendItem.appendChild(colorBox)
  legendItem.appendChild(label)
  legendContainer.appendChild(legendItem)
})


useGeographic();

// Layers definition
const openStreetMap = new TileLayer({
  source: new OSM(),
  title: 'Base map',
});

const mapHuman = new TileLayer({
  source: new OSM({
    url: 'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  }),
  visible: false,
  title: 'OSM humanitarian',
});

const lithology = new TileLayer({
  source: new TileWMS({
    url: 'http://129.151.233.236:8080/geoserver/wms',
    params: { 'LAYERS': 'FiguigWorkSpace:lithology_fg',
      'QUERY_LAYERS': 'FiguigWorkSpace:lithology_fg',
      'TILED': true,
     },
    
    ratio: 1,
    serverType: 'geoserver',
  }),
  visible: true,
  title: 'Lithology',
});

const structural = new TileLayer({
  source: new TileWMS({
    url: 'http://129.151.233.236:8080/geoserver/wms',
    params: { 'LAYERS': 'FiguigWorkSpace:structural' },
    ratio: 1,
    serverType: 'geoserver',
  }),
  visible: true,
  title: 'structural',
});


// Map definition
const map = new Map({
  target: 'map',
  layers: [openStreetMap, lithology, structural],
  view: new View({
    projection: 'EPSG:4326',
    center: [-1.4685, 32.3152],
    zoom: 10,
  }),
});


// Layer switcher
const layerswitcher = new LayerSwitcher({
  title: 'Layers',
});
map.addControl(layerswitcher);


const scaleLine = new ScaleLine()
map.addControl(scaleLine)

// add overlay for popup
const popup = document.getElementById('popup')
const overlay = new Overlay({
  element:popup,
  positioning: 'bottom-center',
  stopEvent: true,
})
map.addOverlay(overlay)


map.on('click', function (e) {
  const viewResolution = map.getView().getResolution();
  const viewProjection = map.getView().getProjection();

  // WMS layer source (assuming you have added a WMS layer to your map)
  const wmsSource = lithology.getSource(); // Replace with your WMS layer variable

  // Get the GetFeatureInfo URL from the layer's source
  const url = wmsSource.getFeatureInfoUrl(
      e.coordinate, // Coordinate of the click
      viewResolution, // Resolution of the map
      viewProjection, // Map projection
      { INFO_FORMAT: 'application/json' } // Request JSON format
  );

  if (url) {
    
      // Fetch the feature info data
      fetch(url)
          .then((response) => response.json())
          .then((data) => {
              console.log('Feature Info:', data);
              if (data.features && data.features.length > 0) {
                  data.features.forEach((feature) => {

                    var featuresToShow = `
                    <button id="close-button">X</button>
                        <b>Code:</b> ${feature.properties.code}<br>
                        <b>Facies:</b> ${feature.properties.facies}<br>
                        <b>Age:</b> ${feature.properties.age}`

                    popup.innerHTML = featuresToShow
                    popup.style.display = ""
                    
                    overlay.setPosition(e.coordinate)
                  });
              } else {
                  popup.innerHTML = '<button id="close-button">X</button> <p>No features found at this location.</p>'
                  popup.style.display = ""
                  overlay.setPosition(e.coordinate)

              }

              // close popup
              document.getElementById('close-button').addEventListener('click', () => {
                popup.style.display = "none"
})
          })
          .catch((error) => console.error('Error fetching feature info:', error));
  } else {
      console.error('Unable to construct GetFeatureInfo URL.');
  }
});


function resetDropDowns(){
  document.getElementById('feature-select').innerHTML = '<option> Select feature</option>'
  document.getElementById('attribute-select').innerHTML = '<option> Select attribute</option>'
  document.getElementById('operator-select').innerHTML = '<option> Select operator</option>'
  document.getElementById('layers-select').innerHTML = `<option value="">Select layer</option>
          <option value="lithology-select">Lithology</option>
          <option value="structural-select">Structural</option>`
  
  if (document.getElementById("query-field")){
    document.getElementById("query-field").style.display = "none"
  }

}

let selectedLayer = ''
// Query settings
let feature;
let operator;
let attribute;
let queryString;
let lengthValue;
let queryNature = '';
let isFieldUsed = false;

// Reset button
const resetBtn = document.getElementById('reset-btn')
resetBtn.addEventListener('click', () => {
  attribute = null;
  operator = null;
  feature = null;
  selectedLayer = null;
  lengthValue = 0
  resetDropDowns()
  const wmsSource = lithology.getSource()
  const wmsSourceFault = structural.getSource()
  wmsSource.updateParams({
    'CQL_FILTER': null
  })
  wmsSourceFault.updateParams({
    'CQL_FILTER': null
  })  
})

//layer Selection
const layerSelection = document.getElementById('layers-select')
const operatorSelect = document.getElementById('operator-select')
const featureSelect = document.getElementById('feature-select')

layerSelection.addEventListener('change', (event) => {
  selectedLayer = event.target.value;  

  operatorSelect.addEventListener('change', (event) => {
    operator = event.target.value
    return operator;
  })


  if (selectedLayer == 'lithology-select'){
    queryNature = 'lithology'
    featureSelect.innerHTML = `<option>Select feature</option>
        <option value='code'>Code</option>
        <option value='facies'>Facies</option>
        <option value='age'>Age</option>`
    operatorSelect.innerHTML = `<option>Select operator</option>
        <option value='='>Equal to (=)</option>'`
    return queryNature;    
  }

  else if (selectedLayer == 'structural-select'){
    queryNature = 'structural'
    featureSelect.innerHTML = `<option>Feature select</option>
        <option value='type'>Type</option>
        <option value='shape_leng'>Length</option>`

    operatorSelect.innerHTML = `
        <option>Select operator</option>
        <option value='='>Equal to (=)</option>
        <option value='>'>Greater than (>)</option>'
        <option value='<'>Less than (<)</option>'`
    
    return queryNature;
  }

  else {
    document.getElementById('feature-select').innerHTML = '<option>Select feature</option>'
    document.getElementById('lithology-select').innerHTML = '<option>Select lithology</option>'
  }
})


const lithologyCodeSelection = document.getElementById('feature-select')
const attributeSelect = document.getElementById('attribute-select')
lithologyCodeSelection.addEventListener('change', (event) => {
  document.getElementById('attribute-select').style.display = '';
  attributeSelect.innerHTML = '';
  attributeSelect.innerHTML = '<option>Select attribute</option>'
  operatorSelect.innerHTML = `<option>Select operator</option>
        <option value='='>Equal to (=)</option>
        `
  feature = event.target.value


  if (feature == 'code'){
    const items = data.data;
    items.forEach(item => {
      attributeSelect.innerHTML += `<option>${item.Code}</option>`
    })
  }

  else if (feature == 'facies'){
    const items = data.data;
    items.forEach(item =>{
      attributeSelect.innerHTML += `<option>${item.Facies}</option>`
    })
  }

  else if(feature == 'age'){
    const items = data.data;
    items.forEach(item => {
      attributeSelect.innerHTML += `<option>${item.Age}</option>`
    })
  }

  else if(feature == 'shape_leng'){
    document.getElementById('length-field').innerHTML = `<input type='number' id="query-field" placeholder="Enter length in Km"></input>`
    document.getElementById('attribute-select').style.display = 'none'
    operatorSelect.innerHTML = `<option>Select operator</option>
        <option value='='>Equal to (=)</option>
        <option value='>'>Greater than (>)</option>'
        <option value='<'>Less than (<)</option>'`
    

        const queryField = document.getElementById("query-field")
        queryField.addEventListener('input', (e)=>{
          lengthValue = e.target.value / 100
          isFieldUsed = true;
          console.log(lengthValue)
          return lengthValue;
        })

  }

  else if(feature == 'type'){
    console.log('type selected')
    attributeSelect.innerHTML += `
    <option value = 'fault'>Visible fault</option>
    <option value = 'hidden'>Hidden fault</option>
    <option value = 'thrust'>Thrust</option>`
  }

  return feature;
})

// attribute selection
attributeSelect.addEventListener('change', (event)=> {
  attribute = event.target.value
  return attribute;
})



// Query button
function query(feature, operator, attribute){
  if(feature == null || operator == null || attribute==null){
    console.log('insuffisent parameters')
    alert('Invalid syntax')
  }

  else {
    queryString = `${feature} ${operator} '${attribute}'`
    console.log(queryString)
  }
}

const queryBtn = document.getElementById('query-btn')
queryBtn.addEventListener('click', ()=>{
  query(feature, operator, attribute)

  if (queryNature == 'lithology'){
    const wmsSource = lithology.getSource()
    wmsSource.updateParams({
      'CQL_FILTER': queryString,
    })
  }
  
  else if (queryNature == 'structural'){
    const wmsSource = structural.getSource()
    if(isFieldUsed){
      query(feature, operator, attribute = lengthValue)
      wmsSource.updateParams({
        'CQL_FILTER': queryString,
      })
  
    }
  
    else {
      query(feature, operator, attribute)
      wmsSource.updateParams({
        'CQL_FILTER': queryString,
      })
  
    }

    
  }
  queryString = null;
})