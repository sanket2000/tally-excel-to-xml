from flask import Flask, render_template, request, send_file
import pandas as pd
from jinja2 import Environment, FileSystemLoader
import os
import io
from pathlib import Path
import uuid

template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
env = Environment(loader=FileSystemLoader(template_dir))
app = Flask(__name__)


# Route for the homepage
@app.route("/")
def index():
    return render_template("index.html")


# Route to handle file upload and XML generation
@app.route("/generate", methods=["POST"])
def generate_xml():
    if "file" not in request.files:
        return "No file uploaded", 400

    file = request.files["file"]

    # Load the uploaded Excel file
    df = read_excel_with_guid(file)

    # Convert date to the required format (YYYYMMDD)
    df["DATE"] = pd.to_datetime(df["DATE"], format="%d-%m-%Y").dt.strftime("%Y%m%d")

    # Replace NaN values with empty strings
    df = df.fillna("")

    # Set up the Jinja2 environment to load templates from the file system
    template = env.get_template("template.xml")

    # Define the company name if needed
    company_name = ""

    # Render the XML
    xml_output = template.render(data=df, company_name=company_name, pd=pd)

    # Use BytesIO to hold the XML data temporarily in memory
    output = io.BytesIO()
    output.write(xml_output.encode("utf-8"))
    output.seek(0)  # Rewind the BytesIO object to the beginning

    # Send the XML file to the user
    return send_file(
        output,
        as_attachment=True,
        download_name=Path(file.filename).stem + "_tally.xml",
        mimetype="application/xml",
    )


def row_guid(row: pd.Series, namespace: uuid.UUID) -> str:
    unique_string = str(row.name)  # Unique based on file + row index
    _guid = uuid.uuid3(namespace, unique_string)
    return str(_guid)  # Generate GUID


def df_guid(file_path: str, df: pd.DataFrame) -> pd.DataFrame:
    _file_name = os.path.basename(file_path)
    _file_namespace = uuid.uuid5(uuid.NAMESPACE_DNS, _file_name)
    df["GUID"] = df.apply(row_guid, args=(_file_namespace,), axis=1)
    return df


def read_excel_with_guid(file):
    df = pd.read_excel(file)
    df = df_guid(file.filename, df)
    return df


if __name__ == "__main__":
    app.run(debug=True)
