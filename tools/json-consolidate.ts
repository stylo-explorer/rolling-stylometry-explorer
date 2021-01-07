import * as meow from 'meow'; //"The complete solution for node.js command-line interfaces"
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { ClassificationData } from '../src/app/classification.service';

const cli = meow(
  `
Usage
$ consolidate <path>`,
  {
    flags: {
      path: {
        isMultiple: true,
      },
    },
  }
);

async function readFiles(files: string[]) {
  let authors = new Set<string>();
  const results = [];
  for (const file of files) {
    const fileData = await parseFile(file);
    authors = new Set<string>([...authors, ...fileData.authors]);
    results.push({
      name: fileData.shortName,
      configurations: fileData.settings,
      data: fileData.obj,
    });
  }
  const authorNames = [];
  for (const author of authors) {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is the full name of the author ' + author + '?',
      },
    ]);
    authorNames.push({
      shortName: author,
      fullName: name,
    });
  }
  const { title, year } = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'What is the title of the analyzed text / book?',
    },
    {
      type: 'input',
      name: 'year',
      message: 'In which year was the text published?',
    },
  ]);

  fs.promises.writeFile(
    'output.json',
    JSON.stringify({
      title,
      year,
      authorNames,
      results,
    })
  );
}

function extractAuthors(data: ClassificationData[]): Set<string> {
  const authors = new Set<string>();
  for (const classificationData of data) {
    for (const segment of classificationData.data) {
      for (const author of segment.results) {
        authors.add(author.author);
      }
    }
  }
  return authors;
}
async function parseFile(file: string) {
  const jsonData = await fs.promises.readFile(file);
  const obj = JSON.parse(jsonData.toString()) as ClassificationData[];
  const { shortName, settings } = await inquirer.prompt([
    { type: 'input', name: 'shortName', message: `Short name for "${file}"` },
    {
      type: 'input',
      name: 'settings',
      message: `What settings have been used for "${file}"`,
    },
  ]);
  const authors = extractAuthors(obj);
  return {
    shortName,
    settings,
    authors,
    obj,
  };
}

readFiles(cli.input);
