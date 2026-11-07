import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  const groups = d3.groups(data, function (row) {
    return row.commit;
  });

  const commits = [];

  for (const group of groups) {
    const id = group[0];
    const lines = group[1];
    const first = lines[0];

    const commit = {
      id: id,
      url: 'https://github.com/srhie2/portfolio/commit/' + id,
      author: first.author,
      date: first.date,
      time: first.time,
      timezone: first.timezone,
      datetime: first.datetime,
      hourFrac: first.datetime.getHours()
        + first.datetime.getMinutes() / 60,
      totalLines: lines.length,
    };

    Object.defineProperty(commit, 'lines', {
      value: lines,
      enumerable: false,
    });

    commits.push(commit);
  }

  return commits;
}

const data = await loadData();
const commits = processCommits(data);

const stats = d3.select('#stats');
const dl = stats.append('dl').attr('class', 'stats');

dl.append('dt').text('Total lines of code');
dl.append('dd').text(data.length);

dl.append('dt').text('Total commits');
dl.append('dd').text(commits.length);

const files = d3.group(data, function (row) {
  return row.file;
});

const fileCount = files.size;

const averageLength = d3.mean(data, function (row) {
  return row.length;
});

const maxDepth = d3.max(data, function (row) {
  return row.depth;
});

dl.append('dt').text('Total files');
dl.append('dd').text(fileCount);

dl.append('dt').text('Average line length');
dl.append('dd').text(averageLength.toFixed(1));

dl.append('dt').text('Maximum depth');
dl.append('dd').text(maxDepth);

function renderScatterPlot(commits) {
  const width = 1000;
  const height = 600;

  const margin = {
    top: 20,
    right: 20,
    bottom: 40,
    left: 60,
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', '0 0 ' + width + ' ' + height)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, function (commit) {
      return commit.datetime;
    }))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const gridlines = d3.axisLeft(yScale)
    .tickFormat('')
    .tickSize(-(width - margin.left - margin.right));

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', 'translate(' + margin.left + ', 0)')
    .call(gridlines);

  const xAxis = d3.axisBottom(xScale);

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(function (hour) {
      return String(hour % 24).padStart(2, '0') + ':00';
    });

  svg.append('g')
    .attr('transform', 'translate(0, ' + (height - margin.bottom) + ')')
    .call(xAxis);

  svg.append('g')
    .attr('transform', 'translate(' + margin.left + ', 0)')
    .call(yAxis);

  const lineRange = d3.extent(commits, function (commit) {
    return commit.totalLines;
  });

  const rScale = d3.scaleSqrt()
    .domain(lineRange)
    .range([2, 30]);

  const sortedCommits = d3.sort(commits, function (commit) {
    return -commit.totalLines;
  });
  
  const dots = svg.append('g')
    .attr('class', 'dots');

  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', function (commit) {
      return xScale(commit.datetime);
    })
    .attr('cy', function (commit) {
      return yScale(commit.hourFrac);
    })
    .attr('r', function (commit) {
      return rScale(commit.totalLines);
    })
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function (event, commit) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 1);

      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
        .on('mouseleave', function (event) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 0.7);

      updateTooltipVisibility(false);
    });

  function isCommitSelected(selection, commit) {
    if (!selection) {
      return false;
    }

    const left = selection[0][0];
    const top = selection[0][1];
    const right = selection[1][0];
    const bottom = selection[1][1];

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= left && x <= right
      && y >= top && y <= bottom;
  }

    function brushed(event) {
    const selection = event.selection;

    dots.selectAll('circle')
      .classed('selected', function (commit) {
        return isCommitSelected(selection, commit);
      });

    const selectedCommits = [];

    for (const commit of commits) {
      if (isCommitSelected(selection, commit)) {
        selectedCommits.push(commit);
      }
    }

    const countElement = document.getElementById('selection-count');

    if (selectedCommits.length === 0) {
      countElement.textContent = 'No commits selected';
    } else {
      countElement.textContent =
        selectedCommits.length + ' commits selected';
    }

    renderLanguageBreakdown(selectedCommits);
  }

  function renderLanguageBreakdown(selectedCommits) {
    const container = d3.select('#language-breakdown');
    container.html('');

    if (selectedCommits.length === 0) {
      return;
    }

    const lines = [];

    for (const commit of selectedCommits) {
      for (const line of commit.lines) {
        lines.push(line);
      }
    }

    const breakdown = d3.rollup(
      lines,
      function (group) {
        return group.length;
      },
      function (line) {
        return line.type;
      }
    );

    for (const entry of breakdown) {
      const language = entry[0];
      const count = entry[1];
      const percentage = (count / lines.length * 100).toFixed(1);

      container.append('dt').text(language);
      container.append('dd')
        .text(count + ' lines (' + percentage + '%)');
    }
  }

  const brush = d3.brush()
    .extent([
      [margin.left, margin.top],
      [width - margin.right, height - margin.bottom],
    ])
    .on('start brush end', brushed);

  const brushGroup = svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  dots.raise();
}

renderScatterPlot(commits);

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');

  link.href = commit.url;
  link.textContent = commit.id;

  document.getElementById('commit-date').textContent =
    commit.datetime.toLocaleDateString();

  document.getElementById('commit-time').textContent =
    commit.datetime.toLocaleTimeString();

  document.getElementById('commit-author').textContent =
    commit.author;

  document.getElementById('commit-lines').textContent =
    commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');

  tooltip.style.left = event.clientX + 'px';
  tooltip.style.top = event.clientY + 'px';
}