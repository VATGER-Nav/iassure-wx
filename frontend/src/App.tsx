import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.css';

import { MapContainer, TileLayer, LayersControl, LayerGroup, Popup, Marker } from 'react-leaflet';
import { Button, Modal, Table } from 'react-bootstrap';

import { useEffect, useState } from 'react';
import wxService from './services/wx.service';
import { WxRegion } from '@shared/types/config.types';
import { WxData } from '../../shared/src/types/wx.types';
import { DivIcon } from 'leaflet';

function App() {
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  
  const [regions, setRegions] = useState<WxRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [wxData, setWxData] = useState<WxData | null>(null);

  function getSetShowModal(val: boolean) {
    return () => setShowModal(val);
  }

  useEffect(() => {
    if (selectedRegion) {
      return;
    }
    
    setLoading(true);

    wxService.getRegions()
      .then(regionsResponse => {
        setRegions(regionsResponse);
        setShowModal(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setLoading(true);

    wxService.getWxData(selectedRegion).then(wxResponse => {
      setWxData(wxResponse);
      setShowModal(false);
      setLoading(false);
      console.log(wxResponse);
    });
  }, [selectedRegion]);

  return (
    <>
      <Modal
        show={showModal}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header>
          <Modal.Title>Regions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped>
            <thead>
              <tr>
                <th>#</th>
                <th>Region</th>
                <th>Fixes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {regions.length ? regions.map((region, idx) => <>
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{region.identifier}</td>
                  <td>{region.fixes.length} Fixes</td>
                  <td>
                    <Button
                      variant={selectedRegion == region.identifier ? 'success' : 'primary'}
                      type='button'
                      onClick={() => setSelectedRegion(region.identifier)}
                    >
                      Select
                    </Button>
                  </td>
                </tr>
              </>) : (<>
                <tr>
                  <td className='p-2 text-center' colSpan={4}>- no regions defined -</td>
                </tr>
              </>)}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <div className='position-absolute bottom-0 p-2' style={{ zIndex: 999 }}>
        <Button variant='outline-secondary' type='button' onClick={getSetShowModal(true)}>↗ {selectedRegion && `(Selected: ${selectedRegion})`}</Button>
      </div>

      <MapContainer style={{ height: '100vh', width: '100vw' }} center={[50.033306, 8.570456]} zoom={7} scrollWheelZoom={true}>
        <TileLayer
          url='https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'
          attribution={[
            '<a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
            '<a href="https://carto.com/attributions" target="_blank">CARTO</a>',
            'Weather data by Open-Meteo.com (<a href="https://open-meteo.com" target="_blank">open-meteo.com</a>)',
            '<a href="https://github.com/dotFionn/iassure-wx" target="_blank">IASsure-WX</a>: <a href="https://fsperath.de" target="_blank">Fionn Sperath</a> and <a href="https://github.com/dotFionn/iassure-wx/graphs/contributors" target="_blank">contributors</a>',
          ].map(str => `&copy; ${str}`).join(' | ')}
          subdomains={'abc'}
          maxZoom={20}
          minZoom={0}
        />

        <LayersControl position='topright'>
          <LayersControl.Overlay checked name='Enable labels'>
            <TileLayer
              url='https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png'
              subdomains={'abc'}
              maxZoom={20}
              minZoom={0}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Points">
            <LayerGroup>
              {Object.entries(wxData?.data || {}).map(([fix, data]) => (
                <>
                <Marker
                  position={[Number(data.coords.lat), Number(data.coords.long)]}
                  key={fix}
                  title={fix}
                  icon={new DivIcon({ html: `⨀&nbsp;<span class="fw-bold">${fix}</span>`, className: 'bg-none text-warning' })}
                >
                  <Popup>
                      <Table>
                        <thead>
                          <tr><th colSpan={3} className='text-center'>{fix}</th></tr>
                          <tr><th>Lvl</th><th>Temp/K</th><th>Wind</th></tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.levels).map(([lvl, lvlData], lvlIdx) => (
                            <tr key={lvlIdx}>
                              <td>{lvl}</td>
                              <td>{Math.round(Number(lvlData['T(K)']))}</td>
                              <td>{lvlData.windhdg}° / {lvlData.windspeed}kts</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Popup>
                </Marker>
                </>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </>
  );
}

export default App;
