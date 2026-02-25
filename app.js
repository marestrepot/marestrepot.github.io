document.addEventListener('DOMContentLoaded', () => {
    // Mapa de coordenadas aproximadas por país para ECharts
    const countryCoords = {
        "Argentina": [-58.3816, -34.6037],
        "México": [-99.1332, 19.4326],
        "Mexico": [-99.1332, 19.4326],
        "España": [-3.7038, 40.4168],
        "Colombia": [-74.0721, 4.7110],
        "Chile": [-70.6483, -33.4569],
        "Estados Unidos": [-80.1918, 25.7617],
        "US": [-80.1918, 25.7617],
        "Costa Rica": [-84.0907, 9.9281],
        "Venezuela": [-66.9036, 10.4806],
        "Perú": [-77.0428, -12.0464],
        "Peru": [-77.0428, -12.0464],
        "Uruguay": [-56.1645, -34.9011]
    };

    // URL del Google Sheets publicado como CSV
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8_OfkYpkx27XHxFyhiWxFIYZvhA6vayBiJCPCa54rJR4_ZFkNEOqDFLDX3zPr0T6rIW0iZG_L73o2/pub?gid=95011046&single=true&output=csv";

    // Función para obtener y procesar el CSV
    function fetchAndProcessData() {
        Papa.parse(csvUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                const data = results.data;

                let totalMembers = 0;
                let validCommunities = [];

                data.forEach(row => {
                    // Validar que tenga nombre de la comunidad
                    if (row['Nombre de la Comunidad']) {
                        const est = parseInt(row['Estimado']) || 0;
                        totalMembers += est;

                        // Encontrar coordenadas
                        const country = row['País'] ? row['País'].trim() : "";
                        const coords = countryCoords[country] || [-50, 20]; // Default Atlántico central si no se encuentra

                        // Extraemos datos según las columnas devueltas
                        validCommunities.push({
                            name: row['Nombre de la Comunidad'],
                            country: country,
                            scope: row['Alcance'] || 'N/A',
                            platform: row['Plataforma Principal'] || 'N/A',
                            estimated: est,
                            frequency: row['Frecuencia de Eventos'] || 'N/A',
                            specialty: row['Especialidad'] || 'N/A',
                            // La columna de líder puede o no venir en este tab. Usamos fallback si existe.
                            leader: row['Lider'] || row['Líder'] || 'No especificado',
                            coords: coords
                        });
                    }
                });

                // Actualizar Stats en el DOM de forma dinámica
                const elEstimado = document.getElementById('total-estimado');
                const elComunidades = document.getElementById('total-comunidades');
                if (elEstimado) elEstimado.textContent = `+${totalMembers.toLocaleString()}`;
                if (elComunidades) elComunidades.textContent = validCommunities.length;

                // Renderizar Mapa
                renderMap(validCommunities);
            },
            error: function (err) {
                console.error("Error fetching CSV:", err);
            }
        });
    }

    // Inicializar Apache ECharts
    const mapDom = document.getElementById('ecosystem-map');
    let myChart = null;
    if (mapDom) {
        myChart = echarts.init(mapDom);
        // Evitar resize error si no está cargado aún
        window.addEventListener('resize', function () {
            if (myChart) myChart.resize();
        });
    }

    function renderMap(communitiesData) {
        if (!myChart) return;

        // ECharts 5 requiere cargar el mapa del mundo manualmente en JSON
        fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')
            .then(response => response.json())
            .then(worldJson => {
                echarts.registerMap('world', worldJson);

                // Formatear datos para el scatter plot
                // Agrupar por coordenadas (país mapeado)
                const groups = {};
                communitiesData.forEach(item => {
                    const key = item.coords.join(',');
                    if (!groups[key]) {
                        groups[key] = {
                            country: item.country || 'Desconocido',
                            coords: item.coords,
                            totalEstimated: 0,
                            communities: []
                        };
                    }
                    groups[key].totalEstimated += item.estimated;
                    groups[key].communities.push(item);
                });

                const scatterData = Object.values(groups).map(group => {
                    return {
                        name: group.country,
                        value: [...group.coords, group.totalEstimated],
                        details: group
                    };
                });

                const option = {
                    backgroundColor: 'transparent',
                    tooltip: {
                        trigger: 'item',
                        enterable: true, // Permite hacer scroll dentro del tooltip
                        backgroundColor: 'rgba(13, 27, 42, 0.95)', // Azul Medianoche con opacidad
                        borderColor: '#00B4D8', // Cian eléctrico
                        borderWidth: 1,
                        textStyle: {
                            color: '#F8F9FA'
                        },
                        padding: 16,
                        formatter: function (params) {
                            if (params.seriesType === 'effectScatter' || params.seriesType === 'scatter') {
                                const group = params.data.details;

                                let tooltipHtml = `
                                    <div style="font-family: 'Inter', sans-serif; min-width: 280px; max-height: 350px; overflow-y: auto; padding-right: 8px;">
                                        <h4 style="color: #00F5D4; font-family: 'Montserrat', sans-serif; font-size: 16px; margin-bottom: 4px;">${group.country}</h4>
                                        <div style="color: #94A3B8; font-size: 12px; margin-bottom: 12px;">Comunidades: <strong style="color: white; font-size: 14px;">${group.communities.length}</strong> | Total Miembros: <strong style="color: #00B4D8; font-size: 14px;">${group.totalEstimated.toLocaleString()}</strong></div>
                                `;

                                group.communities.forEach((data, index) => {
                                    tooltipHtml += `
                                        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05);">
                                            <h5 style="color: #00F5D4; font-size: 13px; margin: 0 0 6px 0;">${data.name}</h5>
                                            <div style="font-size: 11px; line-height: 1.5;">
                                                <span style="color: #94A3B8;">Especialidad:</span> <span style="color: white">${data.specialty}</span><br/>
                                                <span style="color: #94A3B8;">Alcance:</span> <span style="color: white">${data.scope}</span><br/>
                                                <span style="color: #94A3B8;">Plataforma:</span> <span style="color: white">${data.platform}</span><br/>
                                    `;
                                    if (data.leader && data.leader !== 'No especificado') {
                                        tooltipHtml += `<span style="color: #94A3B8;">Líder:</span> <span style="color: white">${data.leader}</span><br/>`;
                                    }
                                    if (data.frequency && data.frequency !== 'N/A') {
                                        tooltipHtml += `<span style="color: #94A3B8;">Frecuencia:</span> <span style="color: white">${data.frequency}</span><br/>`;
                                    }

                                    tooltipHtml += `
                                                <span style="color: #94A3B8;">Estimado:</span> <span style="color: #00B4D8; font-weight: bold;">${data.estimated.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    `;
                                });

                                tooltipHtml += `</div>`;
                                return tooltipHtml;
                            }
                        }
                    },
                    geo: {
                        map: 'world',
                        roam: true, // Permitir zoom y arrastrar
                        zoom: 1.2,
                        center: [-50, 20], // Centrado en América/Atlántico
                        label: {
                            emphasis: { show: false }
                        },
                        itemStyle: {
                            normal: {
                                areaColor: '#1A2E44', // Tierra oscura
                                borderColor: '#0A131F', // Bordes más oscuros
                                borderWidth: 1
                            },
                            emphasis: {
                                areaColor: '#2A4365' // Color al hacer hover en el mapa
                            }
                        }
                    },
                    series: [
                        {
                            name: 'Comunidades',
                            type: 'effectScatter',
                            coordinateSystem: 'geo',
                            data: scatterData,
                            symbolSize: function (val) {
                                // Escalar el tamaño del nodo de 10 a 30 según el número de miembros
                                // Aproximando la comunidad más grande de 30k
                                const size = (val[2] / 30000) * 20 + 10;
                                return Math.min(Math.max(size, 8), 35);
                            },
                            showEffectOn: 'render',
                            rippleEffect: {
                                brushType: 'stroke',
                                scale: 3.5
                            },
                            itemStyle: {
                                normal: {
                                    color: '#00F5D4', // Nodos Verde Neón/Cian
                                    shadowBlur: 15,
                                    shadowColor: '#00F5D4'
                                }
                            }
                        }
                    ]
                };

                myChart.setOption(option);
            })
            .catch(error => console.error("Error cargando el mapa:", error));
    }

    // Iniciar la carga
    fetchAndProcessData();
});
