import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

let query = '';
let selectedYear = null;

const years = [...new Set(projects.map((project) => project.year))];

const colors = d3.scaleOrdinal()
  .domain(years)
  .range(d3.schemeTableau10);

function toggleYear(year) {
  selectedYear = selectedYear === year ? null : year;
  updateDisplay();
}

function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    (group) => group.length,
    (project) => project.year
  );

  const data = rolledData.map(([year, count]) => {
    return {
      value: count,
      label: year,
    };
  });

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);

  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  arcData.forEach((slice) => {
    const year = slice.data.label;

    svg.append('path')
      .attr('d', arcGenerator(slice))
      .attr('fill', colors(year))
      .classed('selected', year === selectedYear)
      .on('click', () => toggleYear(year));
  });

  data.forEach((d) => {
    const item = legend.append('li')
      .attr('class', 'legend-item')
      .classed('selected', d.label === selectedYear)
      .style('--color', colors(d.label));

    const button = item.append('button')
      .attr('type', 'button')
      .attr('class', 'legend-button')
      .attr('aria-pressed', String(d.label === selectedYear))
      .on('click', () => toggleYear(d.label));

    button.append('span')
      .attr('class', 'swatch');

    button.append('span')
      .text(`${d.label} (${d.value})`);
  });
}

function updateDisplay() {
  const searchedProjects = projects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  const visibleProjects = searchedProjects.filter((project) => {
    return selectedYear === null || project.year === selectedYear;
  });

  renderProjects(visibleProjects, projectsContainer, 'h2');
  projectsTitle.textContent = `${visibleProjects.length} Projects`;

  renderPieChart(searchedProjects);

  if (
    selectedYear !== null &&
    !searchedProjects.some((project) => project.year === selectedYear)
  ) {
    d3.select('.legend')
      .append('li')
      .attr('class', 'legend-item')
      .append('button')
      .attr('type', 'button')
      .attr('class', 'legend-button')
      .text(`Clear year filter (${selectedYear})`)
      .on('click', () => {
        selectedYear = null;
        updateDisplay();
      });
  }
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updateDisplay();
});

updateDisplay();